import type { WallpaperPaintSpec } from "@/lib/wallpaper-paint";

let paint: WallpaperPaintSpec | null = null;
const listeners = new Set<() => void>();
export const getWallpaperPaint = () => paint;
export const getServerWallpaperPaint = () => null;
export function subscribeWallpaperPaint(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function publishWallpaperPaint(next: WallpaperPaintSpec | null) {
  if (JSON.stringify(paint) === JSON.stringify(next)) return;
  paint = next;
  listeners.forEach((listener) => listener());
}
