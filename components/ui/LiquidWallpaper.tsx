"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { canUseLiquidRenderer, supportsLiquidBackdrop } from "@/lib/theme";
import { type WallpaperPaintSpec } from "@/lib/wallpaper-paint";
import { getServerWallpaperPaint, getWallpaperPaint, subscribeWallpaperPaint } from "@/services/wallpaper-paint";
import { observeWallpaperSurface } from "@/services/wallpaper-surfaces";

const subscribeCapabilities = () => () => {};
export function supportsWallpaperFilter() {
  return typeof CSS !== "undefined" && typeof ResizeObserver !== "undefined" && CSS.supports("filter", "blur(1px)") && CSS.supports("overflow", "hidden") && CSS.supports("border-radius", "1px") && CSS.supports("translate", "1px");
}
const serverSupport = () => false;

/** The original wallpaper paint, never re-fitted to an individual surface. */
export function WallpaperLayers({ paint, bounded = false }: { paint: WallpaperPaintSpec; bounded?: boolean }) {
  return <span className="liquid-wallpaper-plane" style={{ width: paint.viewport.width, height: paint.viewport.height, backgroundColor: paint.base }}>
    <span className="liquid-wallpaper-image" style={{ left: paint.media.left - paint.viewport.left, top: paint.media.top - paint.viewport.top, width: paint.media.width, height: paint.media.height, backgroundImage: paint.image, backgroundSize: paint.size, backgroundPosition: paint.position, backgroundRepeat: paint.repeat, backgroundColor: paint.color, filter: bounded ? undefined : paint.filter }} />
    <span className="liquid-wallpaper-overlay" style={{ backgroundImage: paint.overlay }} />
    <span className="liquid-wallpaper-scrim" />
  </span>;
}

/** Exterior material only: clip the source before filtering, not a viewport-sized filter per card. */
export function LiquidWallpaper() {
  const { config } = useApp();
  const ref = useRef<HTMLSpanElement>(null);
  const paint = useSyncExternalStore(subscribeWallpaperPaint, getWallpaperPaint, getServerWallpaperPaint);
  const supported = useSyncExternalStore(subscribeCapabilities, supportsWallpaperFilter, serverSupport);
  const live = canUseLiquidRenderer(config.appearance.surfaceMode, config.labs.liveBackdropBlur, supportsLiquidBackdrop());
  const enabled = config.appearance.surfaceMode === "liquid" && !live && supported && paint !== null;

  useLayoutEffect(() => {
    const surface = ref.current?.parentElement;
    if (!surface || !enabled || !paint) return;
    surface.dataset.liquidWallpaper = "";
    const unobserve = observeWallpaperSurface(surface, paint.viewport);
    return () => { unobserve(); delete surface.dataset.liquidWallpaper; };
  }, [enabled, paint]);

  if (!enabled || !paint) return null;
  return <span ref={ref} className="liquid-wallpaper-clip liquid-wallpaper-compact" aria-hidden="true">
    <span className="liquid-wallpaper-crop" style={{ backgroundColor: paint.base, filter: `${paint.filter === "none" ? "" : paint.filter} blur(var(--glass-blur)) saturate(1.06)` }}><WallpaperLayers paint={paint} bounded /></span>
    <span className="liquid-wallpaper-tint" />
  </span>;
}
