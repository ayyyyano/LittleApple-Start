export const DEFAULT_METING_SERVER = "netease";

export function normalizeMetingServer(value: unknown): string {
  return typeof value === "string" ? value.trim() || DEFAULT_METING_SERVER : DEFAULT_METING_SERVER;
}
