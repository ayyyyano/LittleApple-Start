import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiquidWallpaper, supportsWallpaperFilter, WallpaperLayers } from "@/components/ui/LiquidWallpaper";
import { cloneDefaultConfig } from "@/lib/default-config";
import type { WallpaperPaintSpec } from "@/lib/wallpaper-paint";
import { observeWallpaperSurface } from "@/services/wallpaper-surfaces";

const app = vi.hoisted(() => ({ config: null as ReturnType<typeof cloneDefaultConfig> | null }));
vi.mock("@/components/providers/AppProvider", () => ({ useApp: () => ({ config: app.config }) }));
const box = { left: 0, top: 0, width: 1280, height: 720 };
const paint: WallpaperPaintSpec = { viewport: box, media: { left: -8, top: -8, width: 1296, height: 736 }, image: 'url("/wallpaper.png")', size: "cover", position: "30% 70%", repeat: "no-repeat", base: "rgb(20, 20, 20)", color: "transparent", filter: "blur(8px)", overlay: "linear-gradient(black, transparent)" };
afterEach(() => { vi.unstubAllGlobals(); });

describe("bounded static Liquid wallpaper material", () => {
  it.each(["cover", "contain", "100% 100%", "auto"])("shares the existing paint geometry: %s", (size) => {
    const html = renderToStaticMarkup(createElement(WallpaperLayers, { paint: { ...paint, size }, bounded: true }));
    expect(html).toContain("width:1280px;height:720px");
    expect(html).toContain("left:-8px;top:-8px;width:1296px;height:736px");
    expect(html).toContain(`background-size:${size}`);
    expect(html).toContain("background-position:30% 70%");
    expect(html).not.toContain("filter:");
    expect(html).not.toContain("<img");
  });
  it("retains the original large-surface source filter", () => {
    expect(renderToStaticMarkup(createElement(WallpaperLayers, { paint }))).toContain("filter:blur(8px)");
  });
  it.each(["minimal", "material", "liquid"] as const)("SSR never exposes a sharp image or starts live rendering: %s", (mode) => {
    app.config = cloneDefaultConfig(); app.config.appearance.surfaceMode = mode;
    expect(renderToStaticMarkup(createElement(LiquidWallpaper))).toBe("");
  });
  it("requires filter and geometry support, not user-agent guessing", () => {
    expect(supportsWallpaperFilter()).toBe(false);
    vi.stubGlobal("ResizeObserver", class {});
    vi.stubGlobal("CSS", { supports: () => true });
    expect(supportsWallpaperFilter()).toBe(true);
    vi.stubGlobal("CSS", { supports: (property: string) => property !== "filter" });
    expect(supportsWallpaperFilter()).toBe(false);
  });
  it("clips before filtering and never filters foreground or a viewport per card", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.liquid-wallpaper-crop \{[^}]*inset:[^}]*overflow: hidden;[^}]*filter: blur/);
    expect(css).toMatch(/\.liquid-wallpaper-compact \.liquid-wallpaper-plane \{[^}]*filter: none/);
    expect(css).toContain("var(--glass-blur) + var(--background-blur)");
    const exterior = css.slice(css.indexOf('/* Keep the Neutral base'), css.indexOf(':where([data-liquid-wallpaper])'));
    expect(exterior).toContain("isolation: isolate");
    expect(exterior).not.toMatch(/background(?:-color)?:/);
    const small = readFileSync("components/ui/LiquidWallpaper.tsx", "utf8");
    expect(small).toContain("!live && supported && paint !== null");
    expect(small).toContain("delete surface.dataset.liquidWallpaper");
    expect(small).not.toMatch(/canvas|fetch\(|new Image|LiquidGlass/);
    expect(readFileSync("services/wallpaper-surfaces.ts", "utf8")).toContain('attributeFilter: ["class", "style"], childList: true');
  });
  it("shares alignment listeners for 24 cards and releases everything on unmount", () => {
    const events = { addEventListener: vi.fn(), removeEventListener: vi.fn(), visualViewport: { addEventListener: vi.fn(), removeEventListener: vi.fn() } };
    const resizeDisconnect = vi.fn(), placementDisconnect = vi.fn();
    const resizeCtor = vi.fn();
    vi.stubGlobal("window", events);
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("ResizeObserver", class { constructor() { resizeCtor(); } observe() {} unobserve() {} disconnect() { resizeDisconnect(); } });
    vi.stubGlobal("MutationObserver", class { observe() {} disconnect() { placementDisconnect(); } });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("getComputedStyle", () => ({ width: "120px", height: "100px" }));
    const values = new Map<string, string>();
    const cleanups = Array.from({ length: 24 }, (_, index) => observeWallpaperSurface({
      parentElement: null, clientLeft: 1, clientTop: 1,
      getBoundingClientRect: () => ({ left: index * 120, top: 400, width: 120, height: 100 }),
      style: { getPropertyValue: (name: string) => values.get(name), setProperty: (name: string, value: string) => values.set(name, value), removeProperty: (name: string) => values.delete(name) },
    } as unknown as HTMLElement, box));
    expect(resizeCtor).toHaveBeenCalledTimes(1);
    expect(events.addEventListener).toHaveBeenCalledTimes(3);
    expect(values.get("--wallpaper-top")).toBe("-401px");
    cleanups.forEach((cleanup) => cleanup());
    expect(events.removeEventListener).toHaveBeenCalledTimes(3);
    expect(resizeDisconnect).toHaveBeenCalledTimes(1);
    expect(placementDisconnect).toHaveBeenCalled();
    expect(values.size).toBe(0);
  });
});
