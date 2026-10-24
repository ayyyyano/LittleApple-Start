import { wallpaperOrigin, type PaintRect } from "@/lib/wallpaper-paint";

const surfaces = new Map<HTMLElement, PaintRect>();
let resize: ResizeObserver | undefined;
let placement: MutationObserver | undefined;
let frame = 0;

function align(surface: HTMLElement, viewport: PaintRect) {
  const css = getComputedStyle(surface);
  const origin = wallpaperOrigin(viewport, surface.getBoundingClientRect(), parseFloat(css.width) || surface.offsetWidth, parseFloat(css.height) || surface.offsetHeight, surface.clientLeft, surface.clientTop);
  const values = {
    "--wallpaper-left": `${origin.left}px`, "--wallpaper-top": `${origin.top}px`,
    "--wallpaper-scale-x": String(origin.scaleX), "--wallpaper-scale-y": String(origin.scaleY),
  };
  for (const [name, value] of Object.entries(values)) {
    if (surface.style.getPropertyValue(name) !== value) surface.style.setProperty(name, value);
  }
}
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    surfaces.forEach((viewport, surface) => align(surface, viewport));
  });
}
function observeAncestors() {
  placement?.disconnect();
  const ancestors = new Set<HTMLElement>();
  for (const surface of surfaces.keys()) {
    for (let parent = surface.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) ancestors.add(parent);
  }
  ancestors.forEach((parent) => placement?.observe(parent, { attributes: true, attributeFilter: ["class", "style"], childList: true }));
}

/** One event-driven alignment subscription for the entire repeated-card collection. No idle rAF loop. */
export function observeWallpaperSurface(surface: HTMLElement, viewport: PaintRect) {
  if (!surfaces.size) {
    resize = new ResizeObserver(schedule);
    placement = new MutationObserver(schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("transitionend", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
  }
  surfaces.set(surface, viewport);
  resize?.observe(surface);
  observeAncestors();
  align(surface, viewport);
  return () => {
    surfaces.delete(surface); resize?.unobserve(surface);
    for (const name of ["--wallpaper-left", "--wallpaper-top", "--wallpaper-scale-x", "--wallpaper-scale-y"]) surface.style.removeProperty(name);
    observeAncestors();
    if (surfaces.size) return;
    resize?.disconnect(); placement?.disconnect();
    resize = undefined; placement = undefined;
    cancelAnimationFrame(frame); frame = 0;
    window.removeEventListener("resize", schedule);
    window.removeEventListener("scroll", schedule, true);
    window.removeEventListener("transitionend", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
  };
}
