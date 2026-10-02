export interface ThemeTokens {
  accent: string;
  accentHover: string;
  accentMuted: string;
  onAccent: string;
  focusRing: string;
  surface: string;
  surfaceElevated: string;
  surfaceGlass: string;
  surfaceSelected: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  borderTint: string;
  text: string;
  textSecondary: string;
  danger: string;
  dangerMuted: string;
}

export interface LiquidSurfaceTokens {
  surface: string;
  surfaceElevated: string;
  surfaceGlass: string;
  surfaceSelected: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  borderTint: string;
  shadow: string;
  cardShadow: string;
  highlight: string;
  overlay: string;
}

interface RGB { r: number; g: number; b: number }

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHex(value: string, fallback = "#2e8edb"): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export function hexToRgb(value: string): RGB {
  const hex = normalizeHex(value).slice(1);
  return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((channel) => Math.round(clamp(channel)).toString(16).padStart(2, "0")).join("")}`;
}

function mix(first: string, second: string, amount: number): string {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const ratio = Math.min(1, Math.max(0, amount));
  return rgbToHex({ r: a.r + (b.r - a.r) * ratio, g: a.g + (b.g - a.g) * ratio, b: a.b + (b.b - a.b) * ratio });
}

function luminance(value: string): number {
  const rgb = hexToRgb(value);
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureAccentContrast(accent: string, surface: string, dark: boolean): string {
  let candidate = normalizeHex(accent);
  for (let step = 0; step < 8 && contrastRatio(candidate, surface) < 3; step += 1) {
    candidate = mix(candidate, dark ? "#ffffff" : "#07101f", 0.12);
  }
  return candidate;
}

export function createThemeTokens(accentInput: string, dark: boolean, glassTint: number, strength: "soft" | "standard" | "vivid" = "standard"): ThemeTokens {
  const neutralSurface = dark ? "#08111f" : "#f8fcff";
  const strengthFactor = strength === "soft" ? 0.66 : strength === "vivid" ? 1.38 : 1;
  const tintRatio = Math.min(0.22, (0.045 + Math.max(0, glassTint) / 180) * strengthFactor);
  const tintedSurface = mix(neutralSurface, normalizeHex(accentInput), tintRatio);
  const elevated = mix(dark ? "#0e1c31" : "#ffffff", normalizeHex(accentInput), tintRatio * 0.7);
  const accent = ensureAccentContrast(accentInput, tintedSurface, dark);
  const onAccent = contrastRatio(accent, "#ffffff") >= contrastRatio(accent, "#07101f") ? "#ffffff" : "#07101f";
  return {
    accent,
    accentHover: mix(accent, dark ? "#ffffff" : "#07101f", 0.16),
    accentMuted: mix(tintedSurface, accent, dark ? 0.24 : 0.14),
    onAccent,
    focusRing: `${accent}66`,
    surface: tintedSurface,
    surfaceElevated: elevated,
    surfaceGlass: mix(tintedSurface, accent, tintRatio * 0.6),
    surfaceSelected: mix(tintedSurface, accent, Math.min(0.3, 0.15 * strengthFactor)),
    surfaceHover: mix(tintedSurface, accent, Math.min(0.2, 0.075 * strengthFactor)),
    border: mix(tintedSurface, dark ? "#b8d5f2" : "#517aa5", dark ? 0.24 : 0.2),
    borderStrong: mix(tintedSurface, dark ? "#b8d5f2" : "#416b98", dark ? 0.34 : 0.28),
    borderTint: mix(tintedSurface, accent, Math.min(0.46, 0.28 * strengthFactor)),
    text: dark ? "#f3f8ff" : "#10233f",
    textSecondary: dark ? "#adbed3" : "#52677f",
    danger: dark ? "#ff718a" : "#c92548",
    dangerMuted: dark ? "#4a1926" : "#ffe5eb",
  };
}

/**
 * Liquid surfaces intentionally do not derive their large-area colors from the
 * accent palette. The renderer should expose the wallpaper, while these
 * near-achromatic values provide only the minimum readability veil.
 */
export function createLiquidSurfaceTokens(dark: boolean): LiquidSurfaceTokens {
  return dark
    ? {
        surface: "#171b20",
        surfaceElevated: "#20252b",
        surfaceGlass: "#1b2025",
        surfaceSelected: "#2a3036",
        surfaceHover: "#242a30",
        border: "rgb(231 239 246 / .22)",
        borderStrong: "rgb(239 246 252 / .32)",
        borderTint: "rgb(239 246 252 / .26)",
        shadow: "0 22px 60px rgb(0 0 0 / .24), 0 1px 5px rgb(0 0 0 / .12)",
        cardShadow: "0 8px 24px rgb(0 0 0 / .12), 0 1px 3px rgb(0 0 0 / .07)",
        highlight: "rgb(255 255 255 / .22)",
        overlay: "rgb(5 8 11 / .42)",
      }
    : {
        surface: "#f2f4f6",
        surfaceElevated: "#fbfcfd",
        surfaceGlass: "#f6f8f9",
        surfaceSelected: "#e9edf0",
        surfaceHover: "#eef1f3",
        border: "rgb(29 39 49 / .14)",
        borderStrong: "rgb(29 39 49 / .22)",
        borderTint: "rgb(29 39 49 / .18)",
        shadow: "0 20px 48px rgb(35 45 55 / .12), 0 1px 5px rgb(35 45 55 / .06)",
        cardShadow: "0 8px 24px rgb(35 45 55 / .08), 0 1px 3px rgb(35 45 55 / .04)",
        highlight: "rgb(255 255 255 / .58)",
        overlay: "rgb(225 230 235 / .24)",
      };
}

function rgbToHsl({ r, g, b }: RGB): { s: number; l: number } {
  const [red, green, blue] = [r, g, b].map((value) => value / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { s: saturation, l: lightness };
}

function colorDistance(first: RGB, second: RGB): number {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

export async function extractPaletteFromBlob(blob: Blob): Promise<string[]> {
  const { source, cleanup } = await loadPaletteSource(blob);
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    cleanup();
    throw new Error("CANVAS_UNAVAILABLE");
  }
  context.drawImage(source, 0, 0, 96, 96);
  cleanup();
  const pixels = context.getImageData(0, 0, 96, 96).data;
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 180) continue;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const colors = [...buckets.values()].map((bucket) => {
    const rgb = { r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count };
    return { rgb, count: bucket.count, ...rgbToHsl(rgb) };
  }).sort((a, b) => b.count - a.count);
  if (colors.length === 0) throw new Error("NO_COLORS");

  const vibrant = colors.toSorted((a, b) => (b.s * b.count ** 0.45 * (1 - Math.abs(b.l - 0.52))) - (a.s * a.count ** 0.45 * (1 - Math.abs(a.l - 0.52))))[0];
  const muted = colors.filter((color) => color.s <= 0.5 && color.l > 0.22 && color.l < 0.82)[0];
  const dark = colors.filter((color) => color.l <= 0.36).toSorted((a, b) => b.count - a.count)[0];
  const light = colors.filter((color) => color.l >= 0.68).toSorted((a, b) => b.count - a.count)[0];
  const ordered = [colors[0], vibrant, muted, dark, light, ...colors].filter(Boolean);
  const selected: RGB[] = [];
  for (const color of ordered) {
    if (selected.every((candidate) => colorDistance(candidate, color.rgb) >= 42)) selected.push(color.rgb);
    if (selected.length === 5) break;
  }
  return selected.map(rgbToHex);
}

async function loadPaletteSource(blob: Blob): Promise<{ source: CanvasImageSource; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { resizeWidth: 96, resizeHeight: 96, resizeQuality: "low" });
      return { source: bitmap, cleanup: () => bitmap.close() };
    } catch {
      // Some Safari versions expose createImageBitmap but reject resize options.
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.decoding = "async";
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      element.src = objectUrl;
    });
    return { source: image, cleanup: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
