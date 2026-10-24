import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search-suggestions/route";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const request = (query: string, headers?: HeadersInit) => new Request(`https://start.example/api/search-suggestions?${query}`, { headers });

describe("built-in suggestion relay", () => {
  it.each([
    ["baidu", "www.baidu.com"], ["bing", "api.bing.com"],
    ["google", "suggestqueries.google.com"], ["duckduckgo", "duckduckgo.com"],
  ])("requests only the fixed %s endpoint", async (provider, hostname) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(["apple", ["apple music", "Apple Music", "apple watch"]])));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request(`provider=${provider}&q=apple`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: ["apple music", "apple watch"] });
    expect(new URL(fetchMock.mock.calls[0][0] as string).hostname).toBe(hostname);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "error", credentials: "omit" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it.each([
    "provider=custom&q=test", "provider=__proto__&q=test", "provider=constructor&q=test",
    "provider=http://127.0.0.1&q=test", "provider=bing&q=", `provider=bing&q=${"x".repeat(161)}`,
    "provider=bing&q=test&url=http://169.254.169.254/", "url=http://localhost/",
  ])("rejects invalid and arbitrary-target input: %s", async (query) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(request(query))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([{ origin: "https://other.example" }, { "sec-fetch-site": "cross-site" }] as Record<string, string>[])("rejects cross-site callers", async (headers) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(request("provider=bing&q=apple", headers))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("encodes a query as data rather than an upstream address", async () => {
    const query = "apple &url=http://127.0.0.1/#foo";
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);
    await GET(request(`provider=bing&q=${encodeURIComponent(query)}`));
    const target = new URL(fetchMock.mock.calls[0][0] as string);
    expect(target.origin).toBe("https://api.bing.com");
    expect(target.searchParams.get("query")).toBe(query);
    expect(target.searchParams.has("url")).toBe(false);
  });

  it.each([
    new Response("<html>not JSON</html>"), new Response("", { status: 503 }),
    new Response("[]", { headers: { "content-length": "1000000" } }), new Response("x".repeat(65537)),
  ])("bounds and validates upstream responses", async (upstream) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
    expect((await GET(request("provider=bing&q=apple"))).status).toBe(502);
  });

  it("returns a timeout response for a stalled upstream", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => undefined)));
    const pending = GET(request("provider=bing&q=apple"));
    await vi.advanceTimersByTimeAsync(4000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "timeout" });
  });

  it("does not follow upstream redirects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Unexpected redirect")));
    expect((await GET(request("provider=bing&q=apple"))).status).toBe(502);
  });
});
