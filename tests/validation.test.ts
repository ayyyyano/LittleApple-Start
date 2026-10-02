import { describe, expect, it } from "vitest";
import { validateQuickLink, validateSearchEngine } from "@/lib/validation";

describe("user URL validation", () => {
  it("accepts only safe quick-link protocols", () => {
    expect(validateQuickLink({ title: "Safe", url: "https://example.com" }).valid).toBe(true);
    expect(validateQuickLink({ title: "Unsafe", url: "data:text/html,hello" }).error).toBe("invalidUrl");
    expect(validateQuickLink({ title: "Unsafe", url: "javascript:alert(1)" }).error).toBe("invalidUrl");
  });

  it("rejects duplicate quick links", () => {
    const existing = [{ id: "one", title: "One", url: "https://example.com", openInNewTab: true }];
    expect(validateQuickLink({ title: "Two", url: "https://example.com" }, existing).error).toBe("duplicate");
  });

  it("validates search engines and permits legacy prefixes", () => {
    expect(validateSearchEngine({ name: "Legacy", urlTemplate: "https://example.com/search?q=" }).valid).toBe(true);
    expect(validateSearchEngine({ name: "Bad", urlTemplate: "file:///etc/passwd" }).valid).toBe(false);
  });
});
