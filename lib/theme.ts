import type { SurfaceMode } from "@/types/config";

/**
 * True Liquid is an optional enhancement, not a generic surface fallback.
 * Keeping this decision in one pure helper prevents non-liquid themes from
 * accidentally mounting the renderer through a component-specific flag.
 */
export function canUseLiquidRenderer(theme: SurfaceMode, liquidEnabled: boolean, rendererSupported: boolean): boolean {
  return theme === "liquid" && liquidEnabled && rendererSupported;
}

export function supportsLiquidBackdrop(): boolean {
  return typeof CSS !== "undefined" && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
}
