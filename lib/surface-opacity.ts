export function surfaceOpacityProfile(percent: number) {
  const alpha = Math.min(1, Math.max(0, Number.isFinite(percent) ? percent / 100 : 0.8));
  return {
    control: alpha,
    controlHover: Math.min(1, alpha + 0.06),
    panel: alpha,
    panelStrong: Math.min(1, alpha + 0.06),
    panelInner: alpha * 0.65,
  };
}
