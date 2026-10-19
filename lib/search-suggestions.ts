import type { SearchEngine, SuggestionProvider, SuggestionTransport } from "@/types/config";
import { isSafeHttpUrl } from "@/lib/validation";

export function suggestionsAllowed(enabled: boolean, engine?: SearchEngine): boolean {
  return enabled && Boolean(engine) && engine?.suggestionsEnabled !== false;
}

const BUILT_IN_ENDPOINTS: Record<Exclude<SuggestionProvider, "auto" | "custom">, (query: string) => string> = {
  baidu: (query) => `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(query)}`,
  bing: (query) => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
  google: (query) => `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
  duckduckgo: (query) => `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasSearchQueryPlaceholder(template: string): boolean {
  return /\{query\}|%s|\{q\}|\{searchTerms\}/.test(template);
}

export function applySearchQueryTemplate(template: string, query: string): string {
  const encoded = encodeURIComponent(query);
  return template
    .replaceAll("{query}", encoded)
    .replaceAll("%s", encoded)
    .replaceAll("{q}", encoded)
    .replaceAll("{searchTerms}", encoded);
}

export function resolveSuggestionProvider(provider: SuggestionProvider, engine: SearchEngine): Exclude<SuggestionProvider, "auto"> {
  if (provider !== "auto") return provider;
  const haystack = `${engine.id} ${engine.name} ${engine.urlTemplate}`.toLocaleLowerCase();
  if (haystack.includes("google")) return "google";
  if (haystack.includes("baidu") || haystack.includes("百度")) return "baidu";
  if (haystack.includes("duckduckgo") || haystack.includes("duck.com")) return "duckduckgo";
  return "bing";
}

export function buildSuggestionRequestUrl(
  provider: SuggestionProvider,
  customTemplate: string,
  query: string,
  engine: SearchEngine,
  transport: SuggestionTransport = "auto",
  proxyTemplate = "",
): { provider: Exclude<SuggestionProvider, "auto">; url: string } | null {
  if (engine.suggestionsEnabled === false) return null;
  const resolved = resolveSuggestionProvider(provider, engine);
  let target: string;
  if (resolved === "custom") {
    if (!customTemplate || !hasSearchQueryPlaceholder(customTemplate)) return null;
    target = applySearchQueryTemplate(customTemplate, query);
  } else {
    target = BUILT_IN_ENDPOINTS[resolved](query);
  }
  if (!isSafeHttpUrl(target)) return null;
  if (transport === "direct" || (transport === "auto" && resolved === "custom")) return { provider: resolved, url: target };
  if (transport === "custom") {
    if (!proxyTemplate.includes("{url}") || !isSafeHttpUrl(proxyTemplate)) return null;
    return { provider: resolved, url: proxyTemplate.replaceAll("{url}", encodeURIComponent(target)) };
  }
  return { provider: resolved, url: `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` };
}

function collectSuggestionValues(value: unknown, output: string[], depth = 0): void {
  if (depth > 5 || output.length >= 20) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (text.length > 0 && text.length <= 160) output.push(text);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectSuggestionValues(item, output, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const key of ["q", "phrase", "displayText", "text", "value", "suggestion"]) {
    if (typeof value[key] === "string") {
      collectSuggestionValues(value[key], output, depth + 1);
      return;
    }
  }
  for (const key of ["g", "suggestions", "results", "items", "searchSuggestions", "suggestionGroups", "data"]) {
    if (key in value) collectSuggestionValues(value[key], output, depth + 1);
  }
}

export function normalizeSuggestionResponse(value: unknown, query: string): string[] {
  const collected: string[] = [];
  if (Array.isArray(value) && value.length === 2 && Array.isArray(value[1])) collectSuggestionValues(value[1], collected);
  else collectSuggestionValues(value, collected);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [...new Set(collected)].filter((item) => item.toLocaleLowerCase() !== normalizedQuery).slice(0, 8);
}

export async function fetchSearchSuggestions(
  provider: SuggestionProvider,
  customTemplate: string,
  query: string,
  engine: SearchEngine,
  signal: AbortSignal,
  transport: SuggestionTransport = "auto",
  proxyTemplate = "",
): Promise<string[]> {
  const request = buildSuggestionRequestUrl(provider, customTemplate, query, engine, transport, proxyTemplate);
  if (!request) return [];
  const response = await fetch(request.url, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`SUGGESTION_HTTP_${response.status}`);
  return normalizeSuggestionResponse(await response.json() as unknown, query);
}
