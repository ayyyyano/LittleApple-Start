import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as titleRequest } from "@/app/api/site-title/route";
import { GET as iconRequest } from "@/app/api/site-icon/route";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));
vi.mock("@/lib/server/public-http", () => ({ requestPublicUrl: (url: URL, _addresses: unknown, accept: string, signal: AbortSignal) => fetch(url, { signal, headers: { Accept: accept } }) }));

beforeEach(() => {
  lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("shared website metadata network boundary", () => {
  it("returns only a plain title without forwarding markup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<head><title>Example &amp; Docs</title></head><body>private</body>', { headers: { "Content-Type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await titleRequest(new Request("http://localhost/api/site-title?url=https%3A%2F%2Fexample.com"));
    expect(await result.json()).toEqual({ title: "Example & Docs" });
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects local URLs and redirects into private networks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await (await titleRequest(new Request("http://localhost/api/site-title?url=http://localhost"))).json()).toEqual({ title: null });
    expect(fetchMock).not.toHaveBeenCalled();
    lookup.mockImplementation(async (hostname: string) => [{ address: hostname === "127.0.0.1" ? "127.0.0.1" : "8.8.8.8", family: 4 }]);
    expect(await (await titleRequest(new Request("http://localhost/api/site-title?url=https://example.com"))).json()).toEqual({ title: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles missing URLs, bad responses and oversized pages", async () => {
    expect((await titleRequest(new Request("http://localhost/api/site-title"))).status).toBe(400);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response("x".repeat(513 * 1024), { headers: { "Content-Type": "text/html" } }))
      .mockRejectedValueOnce(new Error("Network failed"));
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 3; i += 1) {
      expect(await (await titleRequest(new Request("http://localhost/api/site-title?url=https://example.com"))).json()).toEqual({ title: null });
    }
  });

  it("refreshes declared icons and uses bounded fallbacks after an absent declaration", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<head><link rel="icon" href="/declared.png"></head>', { headers: { "Content-Type": "text/html" } }))
      .mockResolvedValueOnce(new Response('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M0 0h32v32H0z"/></svg>', { headers: { "Content-Type": "image/svg+xml" } }))
      .mockResolvedValueOnce(new Response("<head><title>No icon</title></head>", { headers: { "Content-Type": "text/html" } }))
      .mockRejectedValue(new Error("Not found"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await iconRequest(new Request("http://localhost/api/site-icon?url=https://example.com&refresh=1"));
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://example.com/declared.png");
    const empty = await iconRequest(new Request("http://localhost/api/site-icon?url=https://example.com&refresh=1"));
    expect(empty.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
