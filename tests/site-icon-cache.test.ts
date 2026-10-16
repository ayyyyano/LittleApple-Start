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

  it("returns no image and does not cache an absent declaration", async () => {
    const network = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);

    await expect(loadSiteIconBlob("https://no-icon.example/")).resolves.toBeNull();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("returns no image and does not cache a non-image response", async () => {
    const network = vi.fn(async () => new Response("not an image", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }));
    vi.stubGlobal("fetch", network);

    await expect(loadSiteIconBlob("https://invalid-icon.example/")).resolves.toBeNull();
    expect(cache.put).not.toHaveBeenCalled();
  });
});
