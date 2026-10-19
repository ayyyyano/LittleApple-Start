import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuickLink } from "@/types/config";

let responses: Map<string, Response>;
beforeEach(() => {
  vi.resetModules();
  responses = new Map();
  vi.stubGlobal("caches", { open: async () => ({
    match: async (key: string) => responses.get(key)?.clone(),
    put: async (key: string, response: Response) => { responses.set(key, response.clone()); },
    delete: async (key: string) => responses.delete(key),
    keys: async () => [...responses.keys()],
  }) });
  vi.stubGlobal("Image", class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_url: string) { queueMicrotask(() => this.onload?.()); }
  });
});
afterEach(() => vi.unstubAllGlobals());

const image = (value: string) => new Response(value, { headers: { "Content-Type": "image/png" } });

describe("explicit network icon refresh", () => {
  it("skips uploaded and custom URL icons without changing user configuration", async () => {
    const links: QuickLink[] = [
      { id: "auto", title: "Auto", url: "https://auto.example/", openInNewTab: true },
      { id: "local", title: "Local", url: "https://local.example/", iconAssetId: "quick-link-icon:local", openInNewTab: true },
      { id: "custom", title: "Custom", url: "https://custom.example/", icon: "https://custom.example/pic.png", openInNewTab: true },
    ];
    const snapshot = structuredClone(links);
    const refresh = vi.fn().mockResolvedValue(new Blob(["icon"]));
    const { refreshAutomaticSiteIcons } = await import("@/lib/site-icon-refresh");
    expect(await refreshAutomaticSiteIcons(links, refresh)).toEqual({ loaded: 1, total: 1 });
    expect(refresh).toHaveBeenCalledExactlyOnceWith("https://auto.example/");
    expect(links).toEqual(snapshot);
  });
  it("uses cache first, explicitly bypasses it on refresh, and retains refreshed pixels", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(image("old")).mockResolvedValueOnce(image("new"));
    vi.stubGlobal("fetch", fetchMock);
    const { loadSiteIconBlob, refreshSiteIconBlob } = await import("@/lib/site-icon-cache");
    expect(await (await loadSiteIconBlob("https://example.com/#one"))?.text()).toBe("old");
    expect(await (await loadSiteIconBlob("https://example.com/"))?.text()).toBe("old");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await (await refreshSiteIconBlob("https://example.com/"))?.text()).toBe("new");
    expect(fetchMock.mock.calls[1][0]).toContain("refresh=1");
    expect(fetchMock.mock.calls[1][1]).toEqual({ cache: "no-store" });
    expect(await (await loadSiteIconBlob("https://example.com/"))?.text()).toBe("new");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves a previously valid cache entry when refresh fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(image("old")).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadSiteIconBlob, refreshSiteIconBlob } = await import("@/lib/site-icon-cache");
    await loadSiteIconBlob("https://example.com/");
    expect(await refreshSiteIconBlob("https://example.com/")).toBeNull();
    expect(await (await loadSiteIconBlob("https://example.com/"))?.text()).toBe("old");
  });

  it("does not let an older request overwrite an explicit refresh", async () => {
    let releaseOld!: (response: Response) => void;
    let started!: () => void;
    const firstStarted = new Promise<void>((resolve) => { started = resolve; });
    const fetchMock = vi.fn().mockImplementationOnce(() => { started(); return new Promise<Response>((resolve) => { releaseOld = resolve; }); }).mockResolvedValueOnce(image("latest"));
    vi.stubGlobal("fetch", fetchMock);
    const { loadSiteIconBlob, refreshSiteIconBlob } = await import("@/lib/site-icon-cache");
    const old = loadSiteIconBlob("https://example.com/");
    await firstStarted;
    await refreshSiteIconBlob("https://example.com/");
    releaseOld(image("stale"));
    await old;
    expect(await (await loadSiteIconBlob("https://example.com/"))?.text()).toBe("latest");
  });
});
