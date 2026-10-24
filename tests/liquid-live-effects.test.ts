import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Surface, LIQUID_VISUAL_STYLE } from "@/components/ui/Surface";
import { cloneDefaultConfig } from "@/lib/default-config";
import { canUseLiquidRenderer, supportsLiquidBackdrop } from "@/lib/theme";
import { parseCurrentConfig } from "@/lib/config-parser";
import { maintenanceMessages } from "@/i18n/maintenance";

const app = vi.hoisted(() => ({ config: null as ReturnType<typeof cloneDefaultConfig> | null, rendererImports: 0 }));
vi.mock("@/components/providers/AppProvider", () => ({ useApp: () => ({ config: app.config }) }));
vi.mock("@samasante/liquid-glass", () => {
  app.rendererImports++;
  return { Glass: () => createElement("div", { "data-liquid-glass": true }) };
});
const css = readFileSync("app/globals.css", "utf8");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({ selector: match[1].trim(), body: match[2] }));
afterEach(() => { vi.unstubAllGlobals(); });

describe("global Liquid live effects", () => {
  it.each(["minimal", "material", "liquid"] as const)("requires opt-in and browser support: %s", (theme) => {
    for (const enabled of [false, true]) {
      for (const supported of [false, true]) {
        expect(canUseLiquidRenderer(theme, enabled, supported)).toBe(theme === "liquid" && enabled && supported);
      }
    }
  });

  it("accepts either backdrop-filter property and falls back when unsupported", () => {
    expect(supportsLiquidBackdrop()).toBe(false);
    for (const property of ["backdrop-filter", "-webkit-backdrop-filter"]) {
      vi.stubGlobal("CSS", { supports: (p: string) => p === property });
      expect(supportsLiquidBackdrop()).toBe(true);
    }
    vi.stubGlobal("CSS", { supports: () => false });
    expect(supportsLiquidBackdrop()).toBe(false);
  });

  it("keeps old configs and Reset off without adding a config field", () => {
    const config = cloneDefaultConfig();
    expect(config.labs.liveBackdropBlur).toBe(false);
    const { liveBackdropBlur: omitted, ...labs } = config.labs;
    expect(omitted).toBe(false);
    expect(parseCurrentConfig({ ...config, labs }).labs.liveBackdropBlur).toBe(false);
  });

  it("does not render or import the true renderer while off, including focal surfaces", () => {
    app.config = cloneDefaultConfig();
    vi.stubGlobal("CSS", { supports: () => true });
    for (const name of ["search-row-visual", "floating-player-trigger-surface", "restore-interface-surface"]) {
      const html = renderToStaticMarkup(createElement(Surface, { className: name, style: { backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" } }, "content"));
      expect(html).toContain("content");
      expect(html).toContain("backdrop-filter:none");
      expect(html).not.toContain("blur(40px)");
      expect(html).not.toContain("surface--liquid-renderer");
      expect(html).not.toContain("data-liquid-glass");
      expect(html).not.toContain("<svg");
    }
    expect(app.rendererImports).toBe(0);
  });

  it.each(["minimal", "material"] as const)("leaves %s surface markup unchanged when the setting changes", (mode) => {
    app.config = cloneDefaultConfig();
    app.config.appearance.surfaceMode = mode;
    const surface = createElement(Surface, { className: "test" }, "content");
    const before = renderToStaticMarkup(surface);
    app.config.labs.liveBackdropBlur = true;
    expect(renderToStaticMarkup(surface)).toBe(before);
    expect(before).not.toContain("liquid");
  });

  it("routes every Liquid CSS backdrop declaration through gated variables", () => {
    const gated = new Set<string>();
    for (const rule of rules.filter((r) => r.selector.includes('[data-surface-mode="liquid"]'))) {
      for (const declaration of rule.body.matchAll(/(?:^|[;\s])(?:-webkit-)?backdrop-filter:\s*([^;]+)/g)) {
        expect(declaration[1]).toMatch(/^var\(--liquid-[\w-]+\)$/);
        gated.add(declaration[1].slice(4, -1));
      }
    }
    const defaults = rules.find((r) => r.selector === ':root[data-surface-mode="liquid"]')!.body;
    const enabled = rules.find((r) => r.selector === ':root[data-surface-mode="liquid"][data-liquid-live-effects="on"]')!.body;
    expect(gated.size).toBe(8);
    for (const variable of gated) {
      expect(defaults).toContain(`${variable}: none`);
      expect(enabled).toContain(`${variable}: blur(`);
    }
    expect(LIQUID_VISUAL_STYLE.backdropFilter).toBe("var(--liquid-backdrop-filter, none)");
    expect(LIQUID_VISUAL_STYLE.WebkitBackdropFilter).toBe(LIQUID_VISUAL_STYLE.backdropFilter);
  });

  it("keeps static wallpaper blur independent and supplies neutral small surfaces", () => {
    expect(css).toMatch(/\.liquid-wallpaper-plane \{[^}]*filter: blur\(var\(--glass-blur\)\)/);
    const neutral = rules.filter((r) => r.selector.includes(':not([data-liquid-live-effects="on"])'));
    expect(neutral.length).toBe(5);
    for (const rule of neutral) {
      expect(rule.selector).toContain('[data-surface-mode="liquid"]');
      expect(rule.selector).not.toContain(":is(");
      expect(rule.body).not.toContain("!important");
      expect(rule.body).not.toMatch(/accent|primary-container/);
    }
    expect(neutral[2].selector).toContain(".surface--liquid.search-suggestions");
  });

  it("uses the saved setting for root CSS authorization and component mounting", () => {
    const provider = readFileSync("components/providers/AppProvider.tsx", "utf8");
    const surface = readFileSync("components/ui/Surface.tsx", "utf8");
    for (const code of [provider, surface]) {
      expect(code).toContain("canUseLiquidRenderer(config.appearance.surfaceMode, config.labs.liveBackdropBlur,");
    }
    expect(provider).toContain("root.dataset.liquidLiveEffects");
    expect(surface).toContain('if (!useTrueLiquid) return fallback');
    expect(surface.indexOf("if (!useTrueLiquid) return fallback")).toBeLessThan(surface.indexOf("<LiquidGlass"));
  });

  it("renames the existing setting and explains Search refraction in all locales", () => {
    expect(maintenanceMessages["zh-CN"].liveBackdropBlur).toBe("实时玻璃效果");
    expect(maintenanceMessages["zh-CN"].liveBackdropBlurDescription).toContain("搜索框");
    expect(maintenanceMessages["zh-TW"].liveBackdropBlur).toBe("即時玻璃效果");
    expect(maintenanceMessages.en.liveBackdropBlur).toBe("Live glass effects");
    expect(maintenanceMessages.en.liveBackdropBlurDescription).toContain("refraction");
  });
});
