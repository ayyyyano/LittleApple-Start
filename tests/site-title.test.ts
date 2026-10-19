import { describe, expect, it } from "vitest";
import { findSiteTitle } from "@/lib/site-title";

describe("website title extraction", () => {
  it("decodes title entities and whitespace as plain text", () => {
    expect(findSiteTitle('<head><TITLE> Apple &amp; Pear &#x1F34E;\n &#39;test&#39; </TITLE></head>')).toBe("Apple & Pear 🍎 'test'");
    expect(findSiteTitle("<title>&lt;script&gt;test&lt;/script&gt;</title>")).toBe("<script>test</script>");
  });
  it("does not take body titles or return empty values", () => {
    expect(findSiteTitle("<head></head><body><title>Not metadata</title>")).toBeNull();
    expect(findSiteTitle("<title>  </title>")).toBeNull();
    expect(findSiteTitle("<title>&#x110000;&#55296;</title>")).toBeNull();
    expect(findSiteTitle(`<title>${"x".repeat(100)}</title>`)).toHaveLength(60);
  });
});
