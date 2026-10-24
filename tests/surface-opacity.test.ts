import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { surfaceOpacityProfile } from "@/lib/surface-opacity";

const css = readFileSync("app/globals.css", "utf8");
const provider = readFileSync("components/providers/AppProvider.tsx", "utf8");
const search = readFileSync("components/search/SearchBox.tsx", "utf8");

describe("theme surface controls", () => {
  it("maps the opacity setting to controls, cards and elevated surfaces", () => {
    const low = surfaceOpacityProfile(45);
    const high = surfaceOpacityProfile(96);
    expect(low.panel).toBe(0.45);
    expect(low.control).toBe(0.45);
    expect(low.panelStrong).toBeCloseTo(0.51);
    for (const key of Object.keys(low) as (keyof typeof low)[]) {
      expect(high[key]).toBeGreaterThan(low[key]);
      expect(high[key]).toBeLessThanOrEqual(1);
    }
  });

  it("bounds opacity without changing the stored configuration", () => {
    expect(surfaceOpacityProfile(-5).panel).toBe(0);
    expect(surfaceOpacityProfile(120).panel).toBe(1);
    expect(surfaceOpacityProfile(NaN).panel).toBe(0.8);
  });

  it("uses the configurable profile for Simple and Material while retaining their colors", () => {
    expect(provider).toContain('const opacityProfile = surfaceOpacityProfile(config.appearance.glassOpacity)');
    expect(provider).toMatch(/setProfile\("material",[\s\S]*?glass: "var\(--material-surface-container\)",[\s\S]*?}, opacityProfile\)/);
    expect(provider).toMatch(/setProfile\("minimal",[\s\S]*?}, opacityProfile\)/);
    expect(css).toMatch(/\.surface--material, \.surface--glass \{ background: var\(--material-surface-panel/);
    expect(css).toMatch(/\[data-surface-mode="material"\] \.quick-link-backdrop \{[^}]*background: var\(--material-surface-panel/);
  });

  it("allows CSS blur on Simple and Material surfaces without blurring the modal overlay", () => {
    for (const mode of ["minimal", "material"]) {
      expect(css).toMatch(new RegExp(`\\[data-surface-mode="${mode}"\\] \\.quick-link-backdrop \\{[^}]*backdrop-filter: blur\\(var\\(--glass-blur\\)\\)`));
    }
    const surfaceRules = css.slice(css.indexOf(".surface--minimal {"), css.indexOf(".surface--liquid {"));
    expect(surfaceRules).not.toContain(".dialog-layer");
    expect(css).toMatch(/\[data-surface-mode="material"\] \.dialog-content \{ background: transparent; \}/);
  });

  it("uses the same CSS Liquid material for suggestions and quick-link cards", () => {
    expect(search).toContain('<Surface plain liquidRenderer={false} className="search-suggestions">');
    expect(search).not.toContain('<Surface large plain liquidRenderer={false} className="search-suggestions">');
    expect(css).toMatch(/\[data-surface-mode="liquid"\] \.search-suggestions,\s*:root\[data-surface-mode="liquid"\] \.quick-link-backdrop \{ background: var\(--liquid-surface-panel/);
    expect(css).toMatch(/\.search-suggestions \{[^}]*backdrop-filter: var\(--liquid-backdrop-filter\)/);
  });

  it("keeps solid readable bases when a browser cannot parse color-mix", () => {
    expect(css).toContain("@supports not (color: color-mix(in srgb, white 50%, transparent))");
    expect(css).toContain("--surface-compat-color: var(--minimal-surface-strong-color)");
    expect(css).toContain("--surface-compat-color: var(--material-surface-container)");
  });

  it("places the standard filter after its prefixed fallback for production CSS", () => {
    const rule = css.match(/\.surface--minimal \{[^}]*\}/)![0];
    expect(rule.indexOf("-webkit-backdrop-filter:")).toBeLessThan(rule.indexOf(" backdrop-filter:"));
  });
});
