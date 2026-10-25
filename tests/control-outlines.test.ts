import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLiquidSurfaceTokens } from "@/lib/palette";

const css = readFileSync("app/globals.css", "utf8");
const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
const body = (selector: string) => rules.find((r) => r.selector === selector)!.body;

describe("shared control outline contract", () => {
  it("keeps Dark Liquid outlines light, translucent and only slightly stronger on hover", () => {
    const dark = createLiquidSurfaceTokens(true);
    expect(dark.border).toBe("rgb(231 239 246 / .18)");
    expect(dark.borderStrong).toBe("rgb(239 246 252 / .26)");
    expect(css).toContain("--liquid-fallback-border: rgba(231, 239, 246, 0.18)");
    expect(css).toContain("--liquid-fallback-border-strong: rgba(239, 246, 252, 0.26)");
    expect(createLiquidSurfaceTokens(false).border).toBe("rgb(29 39 49 / .14)");
  });
  it.each(["minimal", "material", "liquid"])("owns control roles without sharing theme colors: %s", (mode) => {
    const role = body(`:root[data-surface-mode="${mode}"]`);
    expect(role).toContain("--control-border:");
    expect(role).toContain("--control-border-hover:");
    expect(role).not.toContain("--control-border: var(--accent)");
    if (mode === "material") expect(role).toContain("--material-outline-variant");
    if (mode === "liquid") expect(role).toContain("--liquid-border");
  });
  it("uses the same primitive roles in the homepage and Dialog", () => {
    for (const selector of [".ui-input, .ui-select", ".ui-button--secondary"]) {
      expect(body(selector)).toContain("var(--control-border)");
      expect(body(selector)).toContain("var(--control-bg) padding-box");
      expect(body(selector)).toContain("var(--control-fg)");
    }
    expect(rules.some((r) => r.selector.includes(".dialog-content .ui-input"))).toBe(false);
  });
  it("does not paint the dark neutral base underneath a translucent outline", () => {
    for (const rule of rules) {
      if (!/\.(?:surface|quick-link-backdrop|top-action|ui-input|ui-select|ui-button--secondary|quick-link-menu|dialog-surface)\b/.test(rule.selector)) continue;
      for (const match of rule.body.matchAll(/(?:^|[;\s])background:\s*([^;]+)/g)) expect(match[1]).toContain("padding-box");
    }
    expect(readFileSync("components/ui/LargeLiquidSurface.tsx", "utf8")).toContain('backgroundClip: "padding-box"');
  });
  it("keeps hover neutral and foreground stable, with a separate keyboard focus ring", () => {
    const hover = body(".ui-button--secondary:hover:not(:disabled)");
    expect(hover).toContain("color: var(--control-fg)");
    expect(hover).toContain("var(--control-bg-hover)");
    expect(hover).toContain("var(--control-border-hover)");
    expect(hover).not.toContain("accent");
    for (const selector of [".top-action:hover", ".settings-trigger:hover:not(:disabled)", ".quick-link:hover .quick-link-backdrop"]) {
      expect(body(selector)).toContain("var(--control-border-hover)");
      expect(body(selector)).not.toContain("var(--accent)");
    }
    expect(body(".ui-input:focus-visible, .ui-select:focus-visible, .ui-button:focus-visible")).toContain("var(--control-focus-ring)");
    expect(body(".ui-input:disabled, .ui-select:disabled")).toContain("var(--control-border-disabled)");
  });
  it("shares the exterior radius with the clipped image, accounting for the one-pixel border", () => {
    expect(body(".ui-button")).toContain("border-radius: var(--control-radius)");
    expect(body(".search-submit")).toContain("--control-radius: 14px");
    expect(body(".search-engine-select .ui-select")).toContain("--control-radius: 14px");
    expect(body(".liquid-wallpaper-clip")).toContain("var(--surface-radius) - 1px");
    expect(body(".liquid-wallpaper-clip")).toContain("--surface-radius-br");
    expect(css).toContain("--surface-radius-bl: 0px; --surface-radius-br: 0px");
    expect(css).toContain(".search-row-surface { --surface-radius: 17px; }");
    expect(css).toContain("clip-path: inset(0 round var(--surface-radius))");
    expect(body(':root[data-theme="dark"][data-surface-mode="material"]')).toContain("var(--material-on-surface-variant) 24%, transparent");
  });
});
