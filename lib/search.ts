import { isSafeHttpUrl } from "@/lib/validation";
import { applySearchQueryTemplate, hasSearchQueryPlaceholder } from "@/lib/search-suggestions";
import type { TranslationProvider } from "@/types/config";

const PLACEHOLDERS = ["%s", "{q}", "{searchTerms}"] as const;

export function generateSearchUrl(template: string, query: string): string {
  if (!isSafeHttpUrl(template)) throw new Error("INVALID_SEARCH_URL");
  const encoded = encodeURIComponent(query.trim());
  const placeholder = PLACEHOLDERS.find((item) => template.includes(item));
  const target = placeholder ? template.split(placeholder).join(encoded) : `${template}${encoded}`;
  if (!isSafeHttpUrl(target)) throw new Error("INVALID_SEARCH_URL");
  return target;
}

export function generateTranslationUrl(provider: TranslationProvider, customTemplate: string, query: string): string | null {
  const encoded = encodeURIComponent(query.trim());
  if (!encoded) return null;
  if (provider === "custom") {
    if (!isSafeHttpUrl(customTemplate) || !hasSearchQueryPlaceholder(customTemplate)) return null;
    return applySearchQueryTemplate(customTemplate, query.trim());
  }
  if (provider === "google") return `https://translate.google.com/?sl=auto&tl=auto&text=${encoded}&op=translate`;
  if (provider === "bing") return `https://www.bing.com/translator?text=${encoded}`;
  return `https://fanyi.baidu.com/#auto/auto/${encoded}`;
}
