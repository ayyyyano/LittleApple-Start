"use client";

import { useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { resolveLargeLiquidMode, wallpaperOrigin, type LiquidCapabilities } from "@/lib/wallpaper-paint";
import { getServerWallpaperPaint, getWallpaperPaint, subscribeWallpaperPaint } from "@/services/wallpaper-paint";

const unavailable: LiquidCapabilities = { imageFilter: false, backdrop: false };
let capabilities: LiquidCapabilities | undefined;
function getCapabilities() {
  return capabilities ??= {
    imageFilter: typeof CSS !== "undefined" && typeof ResizeObserver !== "undefined" && CSS.supports("filter", "blur(1px)") && CSS.supports("overflow", "hidden") && CSS.supports("border-radius", "1px") && CSS.supports("translate", "1px"),
    backdrop: typeof CSS !== "undefined" && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)")),
  };
}
const subscribeCapabilities = () => () => {};

export interface LargeLiquidSurfaceProps {
  children?: ReactNode;
  className?: string;
  as?: "div" | "section" | "nav";
  id?: string;
  role?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
  style?: CSSProperties;
  elementRef?: RefObject<HTMLDivElement | null>;
}

export function LargeLiquidSurface({ children, className, as: Tag = "div", id, role, ariaLabel, ariaHidden, style, elementRef }: LargeLiquidSurfaceProps) {
  const { config } = useApp();
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = elementRef ?? ownRef;
  const paint = useSyncExternalStore(subscribeWallpaperPaint, getWallpaperPaint, getServerWallpaperPaint);
  const support = useSyncExternalStore(subscribeCapabilities, getCapabilities, () => unavailable);
  const mode = resolveLargeLiquidMode(config.labs.liveBackdropBlur, paint, support);

  useLayoutEffect(() => {
    const surface = ref.current;
    if (!surface || !paint || mode !== "wallpaper-blur") return;
    let frame = 0;
    const align = () => {
      const css = getComputedStyle(surface);
      const origin = wallpaperOrigin(paint.viewport, surface.getBoundingClientRect(), parseFloat(css.width) || surface.offsetWidth, parseFloat(css.height) || surface.offsetHeight, surface.clientLeft, surface.clientTop);
      surface.style.setProperty("--wallpaper-left", `${origin.left}px`);
      surface.style.setProperty("--wallpaper-top", `${origin.top}px`);
      surface.style.setProperty("--wallpaper-scale-x", String(origin.scaleX));
      surface.style.setProperty("--wallpaper-scale-y", String(origin.scaleY));
      surface.style.setProperty("--wallpaper-scroll-top", `${surface.scrollTop}px`);
      surface.style.setProperty("--wallpaper-scroll-left", `${surface.scrollLeft}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(align); };
    align();
    const observer = new ResizeObserver(schedule);
    observer.observe(surface);
    const placementObserver = new MutationObserver(schedule);
    for (let parent = surface.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
      placementObserver.observe(parent, { attributes: true, attributeFilter: ["class", "style"] });
    }
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("transitionend", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      observer.disconnect(); placementObserver.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("transitionend", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [mode, paint, ref]);

  const blur = "blur(var(--glass-blur)) saturate(1.06)";
  return <Tag ref={ref} id={id} role={role} aria-label={ariaLabel} aria-hidden={ariaHidden} className={`surface surface--liquid liquid-large-surface ${className ?? ""}`} data-liquid-surface-mode={mode} style={{ ...style, background: mode === "live-backdrop" ? "var(--liquid-large-tint)" : "var(--liquid-large-neutral)", backdropFilter: mode === "live-backdrop" ? blur : "none", WebkitBackdropFilter: mode === "live-backdrop" ? blur : "none" }}>
    {mode === "wallpaper-blur" && paint ? <div className="liquid-wallpaper-clip" aria-hidden="true">
      <div className="liquid-wallpaper-plane" style={{ width: paint.viewport.width, height: paint.viewport.height, backgroundColor: paint.base }}>
        <div className="liquid-wallpaper-image" style={{ left: paint.media.left - paint.viewport.left, top: paint.media.top - paint.viewport.top, width: paint.media.width, height: paint.media.height, backgroundImage: paint.image, backgroundSize: paint.size, backgroundPosition: paint.position, backgroundRepeat: paint.repeat, backgroundColor: paint.color, filter: paint.filter }} />
        <div className="liquid-wallpaper-overlay" style={{ backgroundImage: paint.overlay }} />
        <div className="liquid-wallpaper-scrim" />
      </div>
      <div className="liquid-wallpaper-tint" />
    </div> : null}
    {children}
  </Tag>;
}
