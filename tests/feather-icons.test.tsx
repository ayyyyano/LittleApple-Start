import { describe, expect, it } from "vitest";
import { isFeatherIconName } from "@/components/links/FeatherActionIcon";

describe("top action Feather icons", () => {
  it("accepts supported names and falls back for unknown names", () => {
    expect(isFeatherIconName("GitHub")).toBe(true);
    expect(isFeatherIconName("external-link")).toBe(true);
    expect(isFeatherIconName("not-an-icon")).toBe(false);
    expect(isFeatherIconName(undefined)).toBe(true);
  });
});
