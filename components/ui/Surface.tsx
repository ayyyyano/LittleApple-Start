"use client";

import { Component, lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";
import type { SurfaceMode } from "@/types/config";

const LiquidGlass = lazy(() => import("@samasante/liquid-glass").then((module) => ({ default: module.Glass })));

interface SurfaceProps {
  children?: ReactNode;
  className?: string;
  variant?: SurfaceMode | "auto";
  as?: "div" | "section" | "nav";
  id?: string;
  role?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  liquidRenderer?: boolean;
}

export const LIQUID_VISUAL_STYLE: Pick<CSSProperties, "backdropFilter" | "WebkitBackdropFilter"> = {
  backdropFilter: "blur(var(--glass-blur)) saturate(1.06)",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.06)",
};

interface BoundaryProps { fallback: ReactNode; children: ReactNode }

class LiquidBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // The standard glass fallback remains fully interactive.
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Surface({ children, className, variant = "auto", as: Tag = "div", id, role, ariaLabel, style, liquidRenderer = true }: SurfaceProps) {
  const { config } = useApp();
  const mode = variant === "auto" ? config.appearance.surfaceMode : variant;
  const fallbackStyle = mode === "liquid" && !liquidRenderer
    ? { ...LIQUID_VISUAL_STYLE, ...style }
    : style;
  const fallback = <Tag id={id} role={role} aria-label={ariaLabel} style={fallbackStyle} className={cn("surface", `surface--${mode === "minimal" ? "minimal" : "glass"}`, className)}>{children}</Tag>;

  if (mode !== "liquid" || !liquidRenderer) return fallback;

  // Keep the base surface mounted while the optional renderer loads. The
  // renderer's layout styles are retained, while its duplicate material
  // styles are owned by the stable shell instead.
  const rendererStyle: CSSProperties = {
    ...style,
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
