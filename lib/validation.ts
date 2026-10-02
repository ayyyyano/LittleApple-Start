import type { QuickLink, SearchEngine, TopAction } from "@/types/config";

export interface ValidationResult {
  valid: boolean;
  error?: "required" | "invalidUrl" | "duplicate";
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

export function validateSearchEngine(
  engine: Pick<SearchEngine, "name" | "urlTemplate">,
  existing: SearchEngine[] = [],
  editingId?: string,
): ValidationResult {
  if (!engine.name.trim() || !engine.urlTemplate.trim()) return { valid: false, error: "required" };
  if (!isSafeHttpUrl(engine.urlTemplate)) return { valid: false, error: "invalidUrl" };
  if (
    existing.some(
      (item) =>
        item.id !== editingId &&
        (item.name.trim().toLocaleLowerCase() === engine.name.trim().toLocaleLowerCase() ||
          item.urlTemplate === engine.urlTemplate),
    )
  ) {
    return { valid: false, error: "duplicate" };
  }
  return { valid: true };
}

export function validateQuickLink(
  link: Pick<QuickLink, "title" | "url">,
  existing: QuickLink[] = [],
  editingId?: string,
): ValidationResult {
  if (!link.title.trim() || !link.url.trim()) return { valid: false, error: "required" };
  if (!isSafeHttpUrl(link.url)) return { valid: false, error: "invalidUrl" };
  if (existing.some((item) => item.id !== editingId && item.url === link.url)) {
    return { valid: false, error: "duplicate" };
  }
  return { valid: true };
}

export function validateTopAction(
  action: Pick<TopAction, "title" | "url">,
  existing: TopAction[] = [],
  editingId?: string,
): ValidationResult {
  if (!action.title.trim() || !action.url.trim()) return { valid: false, error: "required" };
  if (!isSafeHttpUrl(action.url)) return { valid: false, error: "invalidUrl" };
  if (existing.some((item) => item.id !== editingId && item.url === action.url)) return { valid: false, error: "duplicate" };
  return { valid: true };
}

export function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
