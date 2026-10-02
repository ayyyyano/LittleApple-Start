import { isSafeHttpUrl } from "@/lib/validation";

const PLACEHOLDERS = ["%s", "{q}", "{searchTerms}"] as const;

export function generateSearchUrl(template: string, query: string): string {
  if (!isSafeHttpUrl(template)) throw new Error("INVALID_SEARCH_URL");
  const encoded = encodeURIComponent(query.trim());
  const placeholder = PLACEHOLDERS.find((item) => template.includes(item));
  const target = placeholder ? template.split(placeholder).join(encoded) : `${template}${encoded}`;
  if (!isSafeHttpUrl(target)) throw new Error("INVALID_SEARCH_URL");
  return target;
}
