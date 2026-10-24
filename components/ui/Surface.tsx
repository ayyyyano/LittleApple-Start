"use client";

import { Component, lazy, Suspense, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from "react";
import { LargeLiquidSurface } from "@/components/ui/LargeLiquidSurface";
import { LiquidWallpaper } from "@/components/ui/LiquidWallpaper";
import { useApp } from "@/components/providers/AppProvider";
import { canUseLiquidRenderer, supportsLiquidBackdrop } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { SurfaceMode } from "@/types/config";

const LiquidGlass = lazy(() => import("@samasante/liquid-glass").then((module) => ({ default: module.Glass })));
const subscribeCapabilities = () => () => {};
const serverBackdropSupport = () => false;

interface SurfaceProps {
  children?: ReactNode;
  className?: string;
  variant?: SurfaceMode | "auto" | "glass" | "standard";
  as?: "div" | "section" | "nav";
  id?: string;
  role?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  liquidRenderer?: boolean;
  large?: boolean;
  plain?: boolean;
  ariaHidden?: boolean;
  elementRef?: RefObject<HTMLDivElement | null>;
}

export const LIQUID_VISUAL_STYLE: Pick<CSSProperties, "backdropFilter" | "WebkitBackdropFilter"> = {
  backdropFilter: "var(--liquid-backdrop-filter, none)",
  WebkitBackdropFilter: "var(--liquid-backdrop-filter, none)",
};

interface BoundaryProps { fallback: ReactNode; children: ReactNode }

class LiquidBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // The CSS surface fallback remains fully interactive.
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Surface({ children, className, variant = "auto", as: Tag = "div", id, role, ariaLabel, ariaHidden, style, liquidRenderer = true, large = false, plain = false, elementRef }: SurfaceProps) {
  const { config } = useApp();
  const backdropSupported = useSyncExternalStore(subscribeCapabilities, supportsLiquidBackdrop, serverBackdropSupport);
  const requestedMode = variant === "auto" ? config.appearance.surfaceMode : variant;
  const mode: SurfaceMode = requestedMode === "glass" || requestedMode === "standard" ? "material" : requestedMode;
  if (mode === "liquid" && large) return <LargeLiquidSurface as={Tag} id={id} role={role} ariaLabel={ariaLabel} ariaHidden={ariaHidden} className={className} style={style} elementRef={elementRef}>{children}</LargeLiquidSurface>;
  if (plain && mode !== "liquid") return <Tag ref={elementRef} id={id} role={role} aria-label={ariaLabel} aria-hidden={ariaHidden} className={className} style={style}>{children}</Tag>;
  const liveEffects = canUseLiquidRenderer(config.appearance.surfaceMode, config.labs.liveBackdropBlur, backdropSupported);
  const useTrueLiquid = liveEffects && mode === "liquid" && liquidRenderer;
  const fallbackStyle = mode === "liquid" && !useTrueLiquid
    ? { ...LIQUID_VISUAL_STYLE, ...style, ...(!liveEffects ? { backdropFilter: "none", WebkitBackdropFilter: "none" } : {}) }
    : style;
  const fallback = <Tag ref={elementRef} id={id} role={role} aria-label={ariaLabel} aria-hidden={ariaHidden} style={fallbackStyle} className={cn("surface", `surface--${mode}`, className)}>{mode === "liquid" && !liveEffects ? <LiquidWallpaper /> : null}{children}</Tag>;

  if (!useTrueLiquid) return fallback;

  // Keep the base surface mounted while the optional renderer loads. The
  // renderer's layout styles are retained, while its duplicate material
  // styles are owned by the stable shell instead.
  const rendererStyle: CSSProperties = {
    ...style,
    display: "block",
    borderRadius: "inherit",
    background: "transparent",
    backgroundColor: "transparent",
    border: "0",
    boxShadow: "none",
  };
  const liquidFallback = <div className="surface--liquid-fallback">{children}</div>;

  return (
    <Tag id={id} role={role} aria-label={ariaLabel} style={style} className={cn("surface", "surface--liquid", "surface--liquid-shell", className)}>
      <LiquidBoundary fallback={liquidFallback}>
        <Suspense fallback={liquidFallback}>
          <LiquidGlass
            style={rendererStyle}
            className={cn("surface", "surface--liquid", "surface--liquid-renderer")}
            optics={{
              frost: Math.max(2, config.appearance.glassBlur * 0.48),
              strength: config.general.motionEnabled ? 0.2 : 0.12,
              depth: 0.86,
              curvature: config.general.motionEnabled ? 0.24 : 0.12,
              dispersion: config.general.motionEnabled ? 0.18 : 0.08,
              bend: 0.38,
              sheen: 0.38,
              glow: 0.14,
            }}
          >
            {children}
          </LiquidGlass>
        </Suspense>
      </LiquidBoundary>
    </Tag>
  );
}
