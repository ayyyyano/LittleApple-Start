import { describe, expect, it } from "vitest";
import { generateSearchUrl } from "@/lib/search";

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
