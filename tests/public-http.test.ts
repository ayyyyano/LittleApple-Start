import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { requestPublicUrl } from "@/lib/server/public-http";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("node:https", () => ({ request }));

describe("pinned public HTTP transport", () => {
  it("connects using validated addresses and retains the original TLS/Host URL", async () => {
    request.mockImplementation((_url, _options, callback) => {
      const outgoing = new EventEmitter() as EventEmitter & { end: () => void };
      outgoing.end = () => {
        const incoming = Object.assign(new PassThrough(), { statusCode: 200, headers: { "content-type": "text/html", "set-cookie": ["private=value"] } });
        callback(incoming);
        incoming.end("public page");
      };
      return outgoing;
    });
    const signal = AbortSignal.timeout(1_000);
    const response = await requestPublicUrl(new URL("https://public.example/path"), [{ address: "8.8.8.8", family: 4 }], "text/html", signal);
    expect(await response.text()).toBe("public page");
    expect(response.headers.has("set-cookie")).toBe(false);
    const [url, options] = request.mock.calls.at(-1)!;
    expect(url.hostname).toBe("public.example");
    expect(options).toMatchObject({ agent: false, signal, headers: { "Accept-Encoding": "identity" } });
    const resolved = vi.fn();
    options.lookup("public.example", { all: true }, resolved);
    expect(resolved).toHaveBeenCalledWith(null, [{ address: "8.8.8.8", family: 4 }]);
    options.lookup("public.example", { family: 4 }, resolved);
    expect(resolved).toHaveBeenLastCalledWith(null, "8.8.8.8", 4);
  });

  it("propagates aborted network requests", async () => {
    request.mockImplementation((_url, options) => {
      const outgoing = new EventEmitter() as EventEmitter & { end: () => void };
      outgoing.end = () => options.signal.addEventListener("abort", () => outgoing.emit("error", options.signal.reason));
      return outgoing;
    });
    const controller = new AbortController();
    const result = requestPublicUrl(new URL("https://public.example"), [{ address: "8.8.8.8", family: 4 }], "image/*", controller.signal);
    controller.abort(new Error("Timed out"));
    await expect(result).rejects.toThrow("Timed out");
  });
});
