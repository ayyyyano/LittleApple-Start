export interface PaintRect { left: number; top: number; width: number; height: number }

/** A snapshot of the wallpaper's painted CSS box, including its existing fit and focal rules. */
export interface WallpaperPaintSpec {
  viewport: PaintRect;
  media: PaintRect;
  image: string;
  size: string;
  position: string;
  repeat: string;
  color: string;
  base: string;
  filter: string;
  overlay: string;
}

export type LargeLiquidMode = "wallpaper-blur" | "neutral" | "live-backdrop";
export interface LiquidCapabilities { imageFilter: boolean; backdrop: boolean }

export function resolveLargeLiquidMode(live: boolean, paint: WallpaperPaintSpec | null, support: LiquidCapabilities): LargeLiquidMode {
  if (live && support.backdrop) return "live-backdrop";
  return paint && support.imageFilter ? "wallpaper-blur" : "neutral";
}

export function wallpaperOrigin(viewport: PaintRect, surface: PaintRect, width: number, height: number, borderLeft = 0, borderTop = 0) {
  const sx = surface.width / width || 1;
  const sy = surface.height / height || 1;
  return {
    left: (viewport.left - surface.left) / sx - borderLeft,
    top: (viewport.top - surface.top) / sy - borderTop,
    scaleX: 1 / sx,
    scaleY: 1 / sy,
  };
}

export function readWallpaperPaint(root: HTMLElement, media: HTMLElement): WallpaperPaintSpec | null {
  const style = getComputedStyle(media);
  if (style.backgroundImage === "none") return null;
  const rect = (e: HTMLElement): PaintRect => {
    const r = e.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const overlay = root.querySelector<HTMLElement>(".background-overlay");
  return {
    viewport: rect(root), media: rect(media), image: style.backgroundImage,
    size: style.backgroundSize, position: style.backgroundPosition, repeat: style.backgroundRepeat,
    color: style.backgroundColor, base: getComputedStyle(root).backgroundColor, filter: style.filter,
    overlay: overlay ? getComputedStyle(overlay).backgroundImage : "none",
  };
}
