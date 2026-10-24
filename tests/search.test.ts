import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSearchUrl, generateTranslationUrl } from "@/lib/search";
import { buildSuggestionRequestUrl, fetchSearchSuggestions, normalizeSuggestionResponse, resolveSuggestionProvider, suggestionsAllowed } from "@/lib/search-suggestions";
import { cloneDefaultConfig } from "@/lib/default-config";
import { parseConfigFile, parseCurrentConfig } from "@/lib/config-parser";

afterEach(() => vi.unstubAllGlobals());

describe("generateSearchUrl", () => {
  it("replaces every supported placeholder", () => {
    expect(generateSearchUrl("https://example.com/?q=%s", "hello world")).toBe("https://example.com/?q=hello%20world");
    expect(generateSearchUrl("https://example.com/?q={q}", "苹果")).toBe("https://example.com/?q=%E8%8B%B9%E6%9E%9C");
    expect(generateSearchUrl("https://example.com/?q={searchTerms}", "a+b")).toBe("https://example.com/?q=a%2Bb");
  });

  it("keeps legacy prefix URLs compatible", () => {
    expect(generateSearchUrl("https://www.bing.com/search?q=", "start page")).toBe("https://www.bing.com/search?q=start%20page");
  });

  it("rejects unsafe protocols", () => {
    expect(() => generateSearchUrl("javascript:alert(1)", "x")).toThrow("INVALID_SEARCH_URL");
  });
});

describe("search suggestion configuration", () => {
  const bing = { id: "bing", name: "Bing", urlTemplate: "https://www.bing.com/search?q=%s" };

  it("resolves automatic providers and builds custom URL templates", () => {
    expect(resolveSuggestionProvider("auto", bing)).toBe("bing");
    expect(buildSuggestionRequestUrl("custom", "https://example.com/suggest?q={query}", "hello world", bing)?.url)
      .toBe("https://example.com/suggest?q=hello%20world");
  });

  it.each(["baidu", "google", "bing"] as const)("automatically follows the built-in %s engine", (id) => {
    const engine = cloneDefaultConfig().search.engines.find((item) => item.id === id)!;
    expect(resolveSuggestionProvider("auto", engine)).toBe(id);
    expect(suggestionsAllowed(true, engine, "auto")).toBe(true);
    expect(buildSuggestionRequestUrl("auto", "", "apple", engine)?.provider).toBe(id);
  });

  it.each([
    { id: "engine-user", name: "My engine", urlTemplate: "https://example.com/search?q=%s" },
    { id: "engine-google", name: "Google", urlTemplate: "https://www.google.com/search?q=%s" },
    { id: "engine-baidu", name: "百度", urlTemplate: "https://www.baidu.com/s?wd=%s" },
    { id: "engine-bing", name: "Bing", urlTemplate: "https://www.bing.com/search?q=%s" },
    { id: "bing", name: "Bing edited", urlTemplate: "https://example.com/search?q=bing" },
    { id: "google", name: "Google edited", urlTemplate: "https://www.google.com.example/search?q=%s" },
  ])("does not guess an automatic source for added/modified engine $id", (engine) => {
    expect(resolveSuggestionProvider("auto", engine)).toBeNull();
    expect(suggestionsAllowed(true, engine, "auto")).toBe(false);
    expect(buildSuggestionRequestUrl("auto", "", "apple", engine)).toBeNull();
  });

  it("makes no automatic request for an added engine, but permits a manual provider", async () => {
    const engine = { id: "engine-user", name: "Custom Google", urlTemplate: "https://example.com?q=%s" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ q: "apple", g: [{ q: "apple music" }] })));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    expect(await fetchSearchSuggestions("auto", "", "apple", engine, signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(suggestionsAllowed(true, engine, "baidu")).toBe(true);
    expect(await fetchSearchSuggestions("baidu", "", "apple", engine, signal)).toEqual(["apple music"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["baidu", "google", "bing", "duckduckgo", "custom"] as const)("respects manual %s source independently of the search engine", (provider) => {
    const engine = { id: "engine-user", name: "Custom", urlTemplate: "https://example.com?q=%s" };
    expect(resolveSuggestionProvider(provider, engine)).toBe(provider);
    expect(buildSuggestionRequestUrl(provider, "https://custom.example/suggest?q={query}", "apple", engine)?.provider).toBe(provider);
    expect(suggestionsAllowed(true, { ...engine, suggestionsEnabled: false }, provider)).toBe(false);
  });

  it.each(["auto", "baidu", "google", "bing", "duckduckgo", "custom"] as const)("persists and imports the %s selection without a new schema field", (provider) => {
    const config = cloneDefaultConfig();
    config.search.suggestionProvider = provider;
    config.search.suggestionApiUrl = "https://custom.example/?q={query}";
    expect(parseCurrentConfig(config).search.suggestionProvider).toBe(provider);
    expect(parseConfigFile(JSON.stringify({ version: 4, config })).config.search).toEqual(config.search);
  });

  it("normalizes common suggestion response shapes", () => {
    expect(normalizeSuggestionResponse(["apple", ["apple pie", "apple watch"]], "apple")).toEqual(["apple pie", "apple watch"]);
    expect(normalizeSuggestionResponse({ g: [{ q: "苹果手机" }, { q: "苹果官网" }] }, "苹果")).toEqual(["苹果手机", "苹果官网"]);
    expect(normalizeSuggestionResponse([{ phrase: "one" }, { displayText: "two" }], "query")).toEqual(["one", "two"]);
  });

  it("reads Baidu's result list instead of stopping at its echoed query", () => {
    expect(normalizeSuggestionResponse({
      q: "apple", p: false,
      g: [{ type: "sug", sa: "s_1", q: "apple教育优惠", no_ai_sug: true }, { type: "sug", q: "apple官网" }],
      queryid: "request-id",
    }, "apple")).toEqual(["apple教育优惠", "apple官网"]);
    expect(normalizeSuggestionResponse({ q: "apple", g: [] }, "apple")).toEqual([]);
    expect(normalizeSuggestionResponse({ q: "apple", s: ["apple music", "apple watch"] }, "apple")).toEqual(["apple music", "apple watch"]);
  });

  it("ignores OpenSearch descriptions, URLs and metadata after the suggestion list", () => {
    expect(normalizeSuggestionResponse([
      "apple", ["apple music", "apple watch"], ["Music description", "Watch description"],
      ["https://example.com/music", "https://example.com/watch"], { metadata: "unused" },
    ], "apple")).toEqual(["apple music", "apple watch"]);
  });

  it("preserves nested custom responses, deduplicates and limits visible results", () => {
    expect(normalizeSuggestionResponse({ data: { q: "apple", suggestions: [{ text: "apple music" }, { text: "apple music" }, { text: "apple watch" }] } }, "apple")).toEqual(["apple music", "apple watch"]);
    expect(normalizeSuggestionResponse([" APPLE ", " ", "x".repeat(161), ...Array.from({ length: 12 }, (_, i) => `apple ${i}`)], "apple")).toEqual(Array.from({ length: 8 }, (_, i) => `apple ${i}`));
  });

  it("returns real-shaped Baidu fetch results to the SearchBox caller", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ q: "苹果", g: [{ q: "苹果官网" }, { q: "苹果手机" }] }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    expect(await fetchSearchSuggestions("baidu", "", "苹果", bing, controller.signal)).toEqual(["苹果官网", "苹果手机"]);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("allorigins.win"), expect.objectContaining({ signal: controller.signal }));
  });

  it("propagates cancelled requests and HTTP failures rather than fabricating suggestions", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockRejectedValueOnce(new DOMException("Aborted", "AbortError")).mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchSearchSuggestions("baidu", "", "apple", bing, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchSearchSuggestions("baidu", "", "apple", bing, new AbortController().signal)).rejects.toThrow("SUGGESTION_HTTP_503");
  });

  it("preserves default routes and explicitly supports direct and custom proxies", () => {
    const direct = buildSuggestionRequestUrl("bing", "", "a & b", bing, "direct")!;
    expect(direct.url).toBe("https://api.bing.com/osjson.aspx?query=a%20%26%20b");
    expect(buildSuggestionRequestUrl("bing", "", "a & b", bing)?.url).toBe(`https://api.allorigins.win/raw?url=${encodeURIComponent(direct.url)}`);
    expect(buildSuggestionRequestUrl("bing", "", "a & b", bing, "custom", "https://proxy.example/?url={url}")?.url).toBe(`https://proxy.example/?url=${encodeURIComponent(direct.url)}`);
    expect(buildSuggestionRequestUrl("custom", "https://api.example/?q={query}", "x", bing, "allorigins")?.url).toContain("allorigins.win");
    expect(buildSuggestionRequestUrl("bing", "", "x", bing, "custom", "https://proxy.example/")).toBeNull();
    expect(buildSuggestionRequestUrl("bing", "", "x", bing, "custom", "javascript:{url}")).toBeNull();
    expect(buildSuggestionRequestUrl("custom", "javascript:{query}", "x", bing)).toBeNull();
  });

  it("does not request suggestions when the selected engine opts out", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const engine = { ...bing, suggestionsEnabled: false };
    expect(suggestionsAllowed(true, engine)).toBe(false);
    expect(suggestionsAllowed(false, bing)).toBe(false);
    expect(suggestionsAllowed(true, bing)).toBe(true);
    expect(await fetchSearchSuggestions("bing", "", "hello", engine, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds configured translation entries", () => {
    expect(generateTranslationUrl("google", "", "hello world")).toContain("text=hello%20world");
    expect(generateTranslationUrl("custom", "https://example.com/translate?q=%s", "苹果")).toBe("https://example.com/translate?q=%E8%8B%B9%E6%9E%9C");
    expect(generateTranslationUrl("custom", "https://example.com/translate", "x")).toBeNull();
  });
});
