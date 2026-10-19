import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSearchUrl, generateTranslationUrl } from "@/lib/search";
import { buildSuggestionRequestUrl, fetchSearchSuggestions, normalizeSuggestionResponse, resolveSuggestionProvider, suggestionsAllowed } from "@/lib/search-suggestions";

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

  it("normalizes common suggestion response shapes", () => {
    expect(normalizeSuggestionResponse(["apple", ["apple pie", "apple watch"]], "apple")).toEqual(["apple pie", "apple watch"]);
    expect(normalizeSuggestionResponse({ g: [{ q: "苹果手机" }, { q: "苹果官网" }] }, "苹果")).toEqual(["苹果手机", "苹果官网"]);
    expect(normalizeSuggestionResponse([{ phrase: "one" }, { displayText: "two" }], "query")).toEqual(["one", "two"]);
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
