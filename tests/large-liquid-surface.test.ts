import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneDefaultConfig } from "@/lib/default-config";
import { parseConfigFile, parseCurrentConfig } from "@/lib/config-parser";
import { publicModelConfiguration } from "@/lib/model-api-config";
import { readWallpaperPaint, resolveLargeLiquidMode, wallpaperOrigin, type WallpaperPaintSpec } from "@/lib/wallpaper-paint";
import { getWallpaperPaint, publishWallpaperPaint, subscribeWallpaperPaint } from "@/services/wallpaper-paint";
import { Surface } from "@/components/ui/Surface";

const app = vi.hoisted(() => ({ config: null as ReturnType<typeof cloneDefaultConfig> | null }));
vi.mock("@/components/providers/AppProvider", () => ({ useApp: () => ({ config: app.config }) }));
const box = { left: 0, top: 0, width: 1280, height: 720 };
const paint: WallpaperPaintSpec = { viewport: box, media: box, image: 'url("/test.png")', size: "cover", position: "30% 70%", repeat: "no-repeat", color: "transparent", base: "rgb(7, 16, 31)", filter: "blur(0px)", overlay: "none" };
afterEach(() => { vi.unstubAllGlobals(); publishWallpaperPaint(null); });

describe("large Liquid surface strategy", () => {
  it("selects static blur by default, live only by opt-in, and neutral when unavailable", () => {
    expect(resolveLargeLiquidMode(false, paint, { imageFilter: true, backdrop: true })).toBe("wallpaper-blur");
    expect(resolveLargeLiquidMode(true, paint, { imageFilter: true, backdrop: true })).toBe("live-backdrop");
    expect(resolveLargeLiquidMode(true, paint, { imageFilter: true, backdrop: false })).toBe("wallpaper-blur");
    expect(resolveLargeLiquidMode(false, null, { imageFilter: true, backdrop: true })).toBe("neutral");
    expect(resolveLargeLiquidMode(false, paint, { imageFilter: false, backdrop: true })).toBe("neutral");
    expect(resolveLargeLiquidMode(true, null, { imageFilter: false, backdrop: true })).toBe("live-backdrop");
    expect(resolveLargeLiquidMode(true, null, { imageFilter: false, backdrop: false })).toBe("neutral");
  });

  it.each(["minimal", "material", "liquid"] as const)("keeps SSR readable and gates the strategy to Liquid: %s", (mode) => {
    app.config = cloneDefaultConfig(); app.config.appearance.surfaceMode = mode;
    const html = renderToStaticMarkup(createElement(Surface, { large: true, className: "dialog-surface" }, createElement("input", { defaultValue: "retained" })));
    expect(html).toContain('value="retained"');
    expect(html).not.toContain("data-liquid-glass");
    if (mode === "liquid") {
      expect(html).toContain('data-liquid-surface-mode="neutral"');
      expect(html).toContain("backdrop-filter:none");
    } else {
      expect(html).not.toContain("liquid-large-surface");
      expect(html).toContain(`surface--${mode}`);
    }
  });

  it("keeps non-Liquid popup markup plain", () => {
    app.config = cloneDefaultConfig(); app.config.appearance.surfaceMode = "material";
    expect(renderToStaticMarkup(createElement(Surface, { large: true, plain: true, className: "ui-select-list" }, "item"))).toBe('<div class="ui-select-list">item</div>');
  });

  it("defaults old configs and Reset to Off and round-trips the opt-in through export/import", () => {
    const config = cloneDefaultConfig();
    expect(config.labs.liveBackdropBlur).toBe(false);
    const { liveBackdropBlur: omitted, ...oldLabs } = config.labs;
    expect(omitted).toBe(false);
    expect(parseCurrentConfig({ ...config, labs: oldLabs }).labs.liveBackdropBlur).toBe(false);
    expect(parseCurrentConfig({ ...config, labs: { ...oldLabs, liveBackdropBlur: "true" } }).labs.liveBackdropBlur).toBe(false);
    config.labs.liveBackdropBlur = true;
    const exported = { version: 4, exportedAt: new Date().toISOString(), config: publicModelConfiguration(config) };
    expect(parseConfigFile(JSON.stringify(exported)).config.labs.liveBackdropBlur).toBe(true);
    expect(cloneDefaultConfig().labs.liveBackdropBlur).toBe(false);
  });

  it.each([
    ["fill", "cover", "30% 70%", "no-repeat"],
    ["fit", "contain", "50% 50%", "no-repeat"],
    ["stretch", "100% 100%", "50% 50%", "no-repeat"],
    ["tile", "auto", "0px 0px", "repeat"],
    ["center", "auto", "50% 50%", "no-repeat"],
  ])("captures the existing %s paint without recalculating it locally", (_, size, position, repeat) => {
    const overlay = {};
    const media = { getBoundingClientRect: () => ({ ...box, left: -4, top: -4, width: 1288, height: 728 }) };
    const root = { getBoundingClientRect: () => box, querySelector: () => overlay };
    vi.stubGlobal("getComputedStyle", (e: unknown) => e === media ? { backgroundImage: paint.image, backgroundSize: size, backgroundPosition: position, backgroundRepeat: repeat, backgroundColor: "rgb(7, 16, 31)", filter: "blur(4px)" } : e === root ? { backgroundColor: paint.base } : { backgroundImage: "linear-gradient(black, transparent)" });
    const result = readWallpaperPaint(root as unknown as HTMLElement, media as unknown as HTMLElement)!;
    expect(result).toMatchObject({ size, position, repeat, media: { left: -4, width: 1288 }, viewport: box, filter: "blur(4px)", base: paint.base });
    expect(wallpaperOrigin(result.viewport, { left: 150, top: 50, width: 980, height: 620 }, 980, 620, 1, 1)).toEqual({ left: -151, top: -51, scaleX: 1, scaleY: 1 });
  });

  it("aligns nested, scaled, and mobile surfaces to the same global origin", () => {
    expect(wallpaperOrigin(box, { left: 390, top: 200, width: 500, height: 300 }, 500, 300)).toEqual({ left: -390, top: -200, scaleX: 1, scaleY: 1 });
    expect(wallpaperOrigin(box, { left: 100, top: 20, width: 200, height: 100 }, 400, 200)).toEqual({ left: -200, top: -40, scaleX: 2, scaleY: 2 });
    expect(wallpaperOrigin({ ...box, width: 390, height: 844 }, { left: 0, top: 0, width: 390, height: 640 }, 390, 640)).toEqual({ left: 0, top: 0, scaleX: 1, scaleY: 1 });
  });

  it("shares one deduplicated snapshot and releases its URL reference", () => {
    const changed = vi.fn(); const unsubscribe = subscribeWallpaperPaint(changed);
    publishWallpaperPaint(paint); publishWallpaperPaint({ ...paint });
    expect(changed).toHaveBeenCalledTimes(1);
    expect(getWallpaperPaint()?.image).toBe(paint.image);
    publishWallpaperPaint(null); expect(getWallpaperPaint()).toBeNull();
    unsubscribe();
  });

  it("leaves Dialog presence ownership and editor content retention intact", () => {
    const dialog = readFileSync("components/ui/Dialog.tsx", "utf8");
    const editor = readFileSync("components/links/LinkEditor.tsx", "utf8");
    expect(dialog).toContain("DIALOG_EXIT_MS = 120");
    expect(dialog).toContain("if (!mounted || !portalTarget) return null");
    expect(dialog).toMatch(/<Surface\s+large/);
    expect(editor).not.toMatch(/open\s*&&\s*<LinkEditorForm/);
  });

  it("realigns position-only changes such as the player's footer offset and cleans up observers", () => {
    const large = readFileSync("components/ui/LargeLiquidSurface.tsx", "utf8");
    expect(large).toContain('attributeFilter: ["class", "style"]');
    expect(large).toContain("surface.parentElement");
    expect(large).toContain("placementObserver.disconnect()");
    expect(wallpaperOrigin(box, { left: 32, top: 500, width: 360, height: 150 }, 360, 150).top).toBe(-500);
    expect(wallpaperOrigin(box, { left: 32, top: 470, width: 360, height: 150 }, 360, 150).top).toBe(-470);
  });
});
