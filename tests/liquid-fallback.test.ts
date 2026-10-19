import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("legacy WebView Liquid fallbacks", () => {
  it("defines parse-safe light and dark surfaces without modern color functions", () => {
    expect(css).toContain("--liquid-fallback-settings: rgba(246, 248, 249, 0.56)");
    expect(css).toContain("--liquid-fallback-settings: rgba(20, 24, 29, 0.58)");
    expect(css).toContain("--liquid-fallback-settings-no-blur: rgba(251, 252, 253, 0.90)");
    expect(css).toContain("--liquid-fallback-settings-no-blur: rgba(20, 24, 29, 0.86)");
    expect(css).toContain("--liquid-fallback-popup: rgba(251, 252, 253, 0.95)");
    expect(css).toContain("--liquid-fallback-popup: rgba(32, 37, 43, 0.95)");
  });

  it("keeps Settings, nested dialogs, and dropdowns readable before enhancement", () => {
    expect(css).toMatch(/\.dialog-surface:has\(\.settings-dialog\) \{ background: var\(--liquid-fallback-settings\)/);
    expect(css).toMatch(/\.dialog-layer:not\(\.dialog-layer--nested\) > \.dialog-surface\.surface--liquid,[\s\S]*?\.dialog-surface:has\(\.settings-dialog\) \{ background: var\(--liquid-fallback-settings-no-blur\)/);
    expect(css).toMatch(/\.dialog-surface--nested \{ background: var\(--liquid-fallback-dialog\)/);
    expect(css).toMatch(/\.ui-select-list \{ background: var\(--liquid-fallback-popup\)/);
    expect(css).toMatch(/\.setting-group \{ border-color: var\(--liquid-fallback-border-strong\); background: var\(--liquid-fallback-panel-inner\)/);
  });

  it("only applies color-mix surfaces from a positive support branch", () => {
    expect(css).toContain("@supports (color: color-mix(in srgb, white 50%, transparent))");
    expect(css).toMatch(/@supports \(color: color-mix[\s\S]*?\.ui-select-list \{ background: var\(--liquid-popup-surface\)/);
  });

  it("checks both prefixed and unprefixed backdrop-filter support", () => {
    expect(css).toContain("@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))");
  });
});
