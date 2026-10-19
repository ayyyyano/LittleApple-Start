import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const surface = readFileSync("components/ui/Surface.tsx", "utf8");
const editor = readFileSync("components/links/LinkEditor.tsx", "utf8");
const experimental = readFileSync("components/settings/ExperimentalSettings.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("Liquid surface geometry and local form spacing", () => {
  it("gives the renderer block layout and the shell's radius, without another border", () => {
    const renderer = surface.slice(surface.indexOf("const rendererStyle:"), surface.indexOf("const liquidFallback"));
    expect(renderer).toContain('display: "block"');
    expect(renderer).toContain('borderRadius: "inherit"');
    expect(renderer).toContain('border: "0"');
    expect(renderer).toContain('boxShadow: "none"');
    expect(css).toMatch(/\.surface--liquid-shell > \.surface--liquid-fallback \{ border-radius: inherit; \}/);
  });

  it("fills the fixed-size player trigger in pending and loaded Liquid states", () => {
    expect(css).toMatch(/\.floating-player-trigger-surface > \.surface--liquid-renderer,\s*\.floating-player-trigger-surface > \.surface--liquid-fallback \{ height: 100%; \}/);
    expect(css).toMatch(/\.floating-player-trigger-surface \{[^}]*width: 46px; height: 46px;/);
  });

  it("spaces the title lookup hint locally and retains its existing text and guards", () => {
    expect(editor).toContain('className="link-title-lookup"');
    expect(editor).toContain('t("fetchTitleHint")');
    expect(editor).toContain('Boolean(title.trim())');
    expect(css).toMatch(/\.link-title-lookup \{ display: grid; justify-items: start; gap: 7px; \}/);
    expect(css).toMatch(/\.link-title-lookup > \.field-hint \{ margin: 0; line-height: 1.5; \}/);
  });

  it("removes separators only from the two standalone experimental resource groups", () => {
    expect(experimental.match(/wallpaper-resource-group--standalone/g)).toHaveLength(2);
    expect(css).toMatch(/\.wallpaper-resource-group--standalone \{ padding-bottom: 0; border-bottom: 0; \}/);
    expect(css).toMatch(/\.wallpaper-resource-group \{[^}]*border-bottom: 1px solid var\(--surface-border-strong\)/);
  });
});
