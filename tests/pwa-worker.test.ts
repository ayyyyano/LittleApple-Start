import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import nextConfig from "@/next.config";

function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const cache = { addAll: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(new Response("offline notice")) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(["littleapple-pwa-v0", "littleapple-pwa-v1", "littleapple-site-icons-v1", "unrelated"]), delete: vi.fn().mockResolvedValue(true) };
  const self = { location: { origin: "https://start.example" }, skipWaiting: vi.fn(), clients: { claim: vi.fn() }, addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler) };
  const fetch = vi.fn().mockResolvedValue(new Response("live"));
  runInNewContext(readFileSync("public/sw.js", "utf8"), { self, caches, fetch, URL, Response });
  return { handlers, cache, caches, self, fetch };
}

describe("PWA assets and network policy", () => {
  it("has a stable standalone manifest and real PNGs at declared sizes", () => {
    const data = manifest();
    expect(data).toMatchObject({ id: "/", name: "LittleApple Start", display: "standalone", start_url: "/", scope: "/" });
    for (const icon of data.icons ?? []) {
      const png = readFileSync(`public${icon.src}`);
      const size = Number(icon.sizes?.split("x")[0]);
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
  });

  it("serves the worker with revalidation headers", async () => {
    const headers = await nextConfig.headers!();
    expect(headers).toContainEqual(expect.objectContaining({ source: "/sw.js", headers: expect.arrayContaining([{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }]) }));
  });

  it("precaches static offline assets and removes only its own old cache", async () => {
    const w = worker();
    let task: Promise<unknown> | undefined;
    w.handlers.get("install")!({ waitUntil: (promise: Promise<unknown>) => { task = promise; } });
    await task;
    expect(w.cache.addAll.mock.calls[0][0]).toContain("/pwa/offline.html");
    expect(w.cache.addAll.mock.calls[0][0].every((url: string) => url.startsWith("/pwa/"))).toBe(true);
    expect(w.self.skipWaiting).toHaveBeenCalledTimes(1);
    w.handlers.get("activate")!({ waitUntil: (promise: Promise<unknown>) => { task = promise; } });
    await task;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("littleapple-pwa-v0");
    expect(w.self.clients.claim).toHaveBeenCalledTimes(1);
  });

  it("passes through APIs, build assets, media and non-navigation traffic", () => {
    const w = worker();
    for (const request of [
      { url: "https://start.example/api/deployment-defaults", mode: "navigate", method: "GET" },
      { url: "https://start.example/_next/static/app.js", mode: "navigate", method: "GET" },
      { url: "https://start.example/?_rsc=123", mode: "cors", method: "GET" },
      { url: "https://remote.example/audio.mp3", mode: "navigate", method: "GET" },
      { url: "https://start.example/", mode: "navigate", method: "POST" },
    ]) {
      const respondWith = vi.fn();
      w.handlers.get("fetch")!({ request, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it("returns fresh navigation responses and uses the offline notice only on failure", async () => {
    const w = worker();
    let response!: Promise<Response>;
    const event = { request: { url: "https://start.example/", mode: "navigate", method: "GET" }, respondWith: (promise: Promise<Response>) => { response = promise; } };
    w.handlers.get("fetch")!(event);
    expect(await (await response).text()).toBe("live");
    expect(w.cache.match).not.toHaveBeenCalled();
    w.fetch.mockRejectedValueOnce(new Error("offline"));
    w.handlers.get("fetch")!(event);
    expect(await (await response).text()).toBe("offline notice");
    w.cache.match.mockResolvedValueOnce(undefined);
    w.fetch.mockRejectedValueOnce(new Error("offline"));
    w.handlers.get("fetch")!(event);
    expect((await response).status).toBe(503);
  });
});
