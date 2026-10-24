import type { SearchEngine, SuggestionProvider, SuggestionTransport } from "@/types/config";
import { isSafeHttpUrl } from "@/lib/validation";

export function suggestionsAllowed(enabled: boolean, engine?: SearchEngine, provider: SuggestionProvider = "auto"): boolean {
  return enabled && Boolean(engine) && engine?.suggestionsEnabled !== false && Boolean(engine && resolveSuggestionProvider(provider, engine));
}

const AUTOMATIC_ENGINE_HOSTS = {
  baidu: ["baidu.com", "www.baidu.com"],
  google: ["google.com", "www.google.com"],
  bing: ["bing.com", "www.bing.com", "cn.bing.com"],
} as const;

const BUILT_IN_ENDPOINTS: Record<Exclude<SuggestionProvider, "auto" | "custom">, (query: string) => string> = {
  baidu: (query) => `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(query)}`,
  bing: (query) => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
  google: (query) => `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
  duckduckgo: (query) => `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
};

export function buildBuiltInSuggestionUrl(provider: string, query: string): string | null {
  if (!Object.hasOwn(BUILT_IN_ENDPOINTS, provider)) return null;
  return BUILT_IN_ENDPOINTS[provider as keyof typeof BUILT_IN_ENDPOINTS](query);
}

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

export function resolveSuggestionProvider(provider: SuggestionProvider, engine: SearchEngine): Exclude<SuggestionProvider, "auto"> | null {
  if (provider !== "auto") return provider;
  const builtIn = (["baidu", "google", "bing"] as const).find((id) => engine.id === id);
  if (!builtIn) return null;
  try {
    const hostname = new URL(engine.urlTemplate).hostname;
    return (AUTOMATIC_ENGINE_HOSTS[builtIn] as readonly string[]).includes(hostname) ? builtIn : null;
  } catch {
    return null;
  }
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
  if (!resolved) return null;
  let target: string;
  if (resolved === "custom") {
    if (!customTemplate || !hasSearchQueryPlaceholder(customTemplate)) return null;
    target = applySearchQueryTemplate(customTemplate, query);
  } else {
    target = BUILT_IN_ENDPOINTS[resolved](query);
  }
  if (!isSafeHttpUrl(target)) return null;
  if (transport === "direct" || ((transport === "auto" || transport === "allorigins") && resolved === "custom")) return { provider: resolved, url: target };
  if (transport === "custom") {
    if (!proxyTemplate.includes("{url}") || !isSafeHttpUrl(proxyTemplate)) return null;
    return { provider: resolved, url: proxyTemplate.replaceAll("{url}", encodeURIComponent(target)) };
  }
  return { provider: resolved, url: `/api/search-suggestions?provider=${resolved}&q=${encodeURIComponent(query)}` };
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
  // Provider envelopes can include both the echoed query (`q`) and a result list.
  const collectionKeys = ["g", "s", "suggestions", "results", "items", "searchSuggestions", "suggestionGroups", "data"];
  const collections = collectionKeys.filter((key) => key in value);
  if (collections.length > 0) {
    for (const key of collections) collectSuggestionValues(value[key], output, depth + 1);
    return;
  }
  for (const key of ["q", "phrase", "displayText", "text", "value", "suggestion"]) {
    if (typeof value[key] === "string") {
      collectSuggestionValues(value[key], output, depth + 1);
      return;
    }
  }
}

export function normalizeSuggestionResponse(value: unknown, query: string): string[] {
  const collected: string[] = [];
  if (Array.isArray(value) && typeof value[0] === "string" && Array.isArray(value[1])) collectSuggestionValues(value[1], collected);
  else collectSuggestionValues(value, collected);
  const key = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const seen = new Set([key(query)]);
  return collected.filter((item) => {
    const normalized = key(item);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(0, 8);
}

export const SUGGESTION_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 64 * 1024;

export async function fetchSuggestionJson(url: string, signal: AbortSignal, timeoutMs = SUGGESTION_TIMEOUT_MS, redirect: RequestRedirect = "follow"): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: () => void = () => undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("SUGGESTION_TIMEOUT"));
    }, timeoutMs);
  });
  const request = async () => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", redirect, headers: { Accept: "application/json" } });
    if (response.status === 504) throw new Error("SUGGESTION_TIMEOUT");
    if (!response.ok) throw new Error(`SUGGESTION_HTTP_${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) throw new Error("SUGGESTION_RESPONSE_TOO_LARGE");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("SUGGESTION_INVALID_RESPONSE");
    const decoder = new TextDecoder();
    let length = 0;
    let body = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_RESPONSE_BYTES) throw new Error("SUGGESTION_RESPONSE_TOO_LARGE");
        body += decoder.decode(value, { stream: true });
      }
      return JSON.parse(body + decoder.decode()) as unknown;
    } finally {
      void reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  };
  try {
    return await Promise.race([cancelled, request()]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    controller.abort();
  }
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
  return normalizeSuggestionResponse(await fetchSuggestionJson(request.url, signal), query);
}
