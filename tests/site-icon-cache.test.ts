import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadSiteIconBlob } from "@/lib/site-icon-cache";

type CacheKey = RequestInfo | URL;

function keyFor(request: CacheKey): string {
  if (typeof request === "string") return request;
  if (request instanceof URL) return request.href;
  return request.url;
}

describe("site icon local cache", () => {
  const entries = new Map<string, Response>();
  const cache = {
    delete: vi.fn(async (request: CacheKey) => entries.delete(keyFor(request))),
    keys: vi.fn(async () => []),
    match: vi.fn(async (request: CacheKey) => entries.get(keyFor(request))?.clone()),
    put: vi.fn(async (request: CacheKey, response: Response) => {
      entries.set(keyFor(request), response.clone());
    }),
  } as unknown as Cache;

  beforeEach(() => {
    entries.clear();
    vi.clearAllMocks();
    vi.stubGlobal("caches", { open: vi.fn(async () => cache) });
    vi.stubGlobal("Image", class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:site-icon-test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("stores a valid network icon and uses it before the network next time", async () => {
    const network = vi.fn(async () => new Response(
      new Blob(["<svg></svg>"], { type: "image/svg+xml" }),
      { status: 200 },
    ));
    vi.stubGlobal("fetch", network);

    const first = await loadSiteIconBlob("https://example.com/");
    expect(first?.type).toBe("image/svg+xml");
    expect(network).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledTimes(1);

    network.mockRejectedValueOnce(new Error("offline"));
    const cached = await loadSiteIconBlob("https://example.com/");
    expect(cached?.type).toBe("image/svg+xml");
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("stores a short failure marker without caching image data for missing icons", async () => {
    const network = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);

    await expect(loadSiteIconBlob("https://no-icon.example/")).resolves.toBeNull();
    const marker = [...entries.values()][0];
    expect(marker.status).toBe(204);
    expect((await marker.blob()).size).toBe(0);
  });

  it("returns no image and does not cache a non-image response", async () => {
    const network = vi.fn(async () => new Response("not an image", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }));
    vi.stubGlobal("fetch", network);

    await expect(loadSiteIconBlob("https://invalid-icon.example/")).resolves.toBeNull();
    expect([...entries.values()][0].status).toBe(204);
  });

  it("deduplicates a domain across paths and strips queries before requesting metadata", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("svg", { headers: { "Content-Type": "image/svg+xml" } }));
    vi.stubGlobal("fetch", network);
    await Promise.all([loadSiteIconBlob("https://dedup.example/app?token=secret#hash"), loadSiteIconBlob("https://dedup.example/other")]);
    expect(network).toHaveBeenCalledTimes(1);
    expect(String(network.mock.calls[0][0])).toBe("/api/site-icon?url=https%3A%2F%2Fdedup.example%2Fapp");
    expect(await loadSiteIconBlob("https://dedup.example/third")).toBeInstanceOf(Blob);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("backs off failures, then allows a later automatic retry", async () => {
    vi.useFakeTimers();
    const network = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);
    await loadSiteIconBlob("https://retry.example/");
    await loadSiteIconBlob("https://retry.example/");
    expect(network).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1);
    await loadSiteIconBlob("https://retry.example/");
    expect(network).toHaveBeenCalledTimes(2);
  });

  it("revalidates expired cached images and retains them while offline", async () => {
    vi.useFakeTimers();
    const network = vi.fn().mockResolvedValueOnce(new Response("svg", { headers: { "Content-Type": "image/svg+xml" } })).mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", network);
    await loadSiteIconBlob("https://expiry.example/");
    await vi.advanceTimersByTimeAsync(31 * 24 * 60 * 60_000);
    expect(await loadSiteIconBlob("https://expiry.example/")).toBeInstanceOf(Blob);
    expect(network).toHaveBeenCalledTimes(2);
  });

  it("continues after browser decode failure, storing only the decoded alternative", async () => {
    let images = 0;
    vi.stubGlobal("Image", class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { const bad = images++ === 0; queueMicrotask(() => bad ? this.onerror?.() : this.onload?.()); }
    });
    const network = vi.fn().mockResolvedValueOnce(new Response("bad", { headers: { "Content-Type": "image/png", "X-Site-Icon-Next": "1" } }))
      .mockResolvedValueOnce(new Response("good", { headers: { "Content-Type": "image/png" } }));
    vi.stubGlobal("fetch", network);
    expect(await (await loadSiteIconBlob("https://decode.example/"))?.text()).toBe("good");
    expect(network.mock.calls[1][0]).toContain("start=1");
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it("times out an image decode and keeps initials instead of hanging indefinitely", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Image", class { set src(_value: string) {} });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("stalled", { headers: { "Content-Type": "image/png" } })));
    const pending = loadSiteIconBlob("https://stalled.example/");
    await vi.advanceTimersByTimeAsync(2_001);
    await expect(pending).resolves.toBeNull();
    expect([...entries.values()][0].status).toBe(204);
  });
});
