import type { QuoteProvider } from "@/types/config";

export function quoteProviderKey(provider: QuoteProvider): string {
  if (provider.type === "static") return `static:${provider.text}`;
  if (provider.type === "hitokoto") return "hitokoto";
  return `custom:${provider.endpoint}:${provider.textPath}`;
}

export function quoteFallback(provider: QuoteProvider): string {
  return provider.type === "static" ? provider.text : provider.fallback;
}

export function readTextPath(value: unknown, path: string): string | null {
  const segments = path.split(".").filter(Boolean);
  let current = value;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" && current.trim() ? current.trim().slice(0, 280) : null;
}
