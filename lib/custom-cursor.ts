const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle/i;

export interface CursorImageSettings {
  size: number | null;
  hotspotX: number;
  hotspotY: number;
}

export function cursorGeometry(width: number, height: number, settings: CursorImageSettings) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 32;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 32;
  const requestedWidth = settings.size === null || !Number.isFinite(settings.size) ? safeWidth : Math.max(16, Math.min(128, settings.size));
  const scale = Math.min(requestedWidth / safeWidth, 128 / safeWidth, 128 / safeHeight);
  const outputWidth = Math.max(1, Math.round(safeWidth * scale));
  const outputHeight = Math.max(1, Math.round(safeHeight * scale));
  const hotspot = (value: number, maximum: number) => Math.round(Math.max(0, Math.min(maximum, Number.isFinite(value) ? value : 0)));
  return { width: outputWidth, height: outputHeight, hotspotX: hotspot(settings.hotspotX, outputWidth - 1), hotspotY: hotspot(settings.hotspotY, outputHeight - 1) };
}

export interface CursorEnvironment {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  hasFinePointer: boolean;
}

export function isMobileUserAgent({ userAgent, platform = "", maxTouchPoints = 0 }: Omit<CursorEnvironment, "hasFinePointer">): boolean {
  if (MOBILE_USER_AGENT.test(userAgent)) return true;
  // iPadOS can request a desktop UA and identify itself as MacIntel.
  return platform === "MacIntel" && maxTouchPoints > 1;
}

export function canUseCustomCursor(environment: CursorEnvironment): boolean {
  return environment.hasFinePointer && !isMobileUserAgent(environment);
}

export function getDesktopCursorSupport(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return canUseCustomCursor({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    hasFinePointer: window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches,
  });
}

export function subscribeToDesktopCursorSupport(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
