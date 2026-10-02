import { describe, expect, it } from "vitest";
import { contrastRatio, createThemeTokens, normalizeHex } from "@/lib/palette";

describe("palette engine", () => {
  it("normalizes unsafe color input", () => {
    expect(normalizeHex("#AABBCC")).toBe("#aabbcc");
    expect(normalizeHex("blue")).toBe("#2e8edb");
  });

  it("keeps accent and content contrast usable in light and dark themes", () => {
    const representativeColors = ["#f5f7fa", "#080b12", "#ff2d7d", "#8b8f86", "#24d7ff"];
    for (const accent of representativeColors) {
      for (const dark of [false, true]) {
        const tokens = createThemeTokens(accent, dark, 12);
        expect(contrastRatio(tokens.accent, tokens.surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(tokens.onAccent, tokens.accent)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("increases surface tint without changing contrast guarantees", () => {
    const soft = createThemeTokens("#ff3b80", false, 12, "soft");
    const vivid = createThemeTokens("#ff3b80", false, 12, "vivid");
    expect(vivid.surface).not.toBe(soft.surface);
    expect(vivid.surfaceSelected).not.toBe(soft.surfaceSelected);
    expect(contrastRatio(vivid.accent, vivid.surface)).toBeGreaterThanOrEqual(3);
  });
});
