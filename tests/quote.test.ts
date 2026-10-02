import { describe, expect, it } from "vitest";
import { quoteFallback, quoteProviderKey, readTextPath } from "@/lib/quote";

describe("quote providers", () => {
  it("reads a nested JSON text path without interpreting markup", () => {
    expect(readTextPath({ data: { content: "<b>Hello</b>" } }, "data.content")).toBe("<b>Hello</b>");
    expect(readTextPath({ data: [] }, "data.content")).toBeNull();
  });

  it("builds stable provider keys and fallbacks", () => {
    const provider = { type: "custom", endpoint: "https://example.com", textPath: "content", fallback: "Fallback" } as const;
    expect(quoteProviderKey(provider)).toContain("https://example.com");
    expect(quoteFallback(provider)).toBe("Fallback");
  });
});
