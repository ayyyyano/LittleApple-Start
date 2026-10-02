const QUOTE_CACHE_KEY = "littleapple.quote-cache.v1";

interface QuoteCacheEntry {
  providerKey: string;
  text: string;
  updatedAt: string;
}

export function readQuoteCache(providerKey: string): string | null {
  try {
    const raw = localStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<QuoteCacheEntry>;
    return entry.providerKey === providerKey && typeof entry.text === "string" && entry.text.trim() ? entry.text : null;
  } catch {
    return null;
  }
}

export function writeQuoteCache(providerKey: string, text: string): void {
  const entry: QuoteCacheEntry = { providerKey, text, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Quote display should not fail when browser storage is unavailable.
  }
}

export function clearQuoteCache(): void {
  try { localStorage.removeItem(QUOTE_CACHE_KEY); } catch { /* no-op */ }
}
