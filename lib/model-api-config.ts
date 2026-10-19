import type { AppConfig, ModelApiProfile } from "@/types/config";

export function normalizeModelEndpoint(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  const loopback = url.hostname === "localhost" || url.hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.search || url.hash) {
    throw new Error("INVALID_MODEL_ENDPOINT");
  }
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/chat/completions") ? path : `${path.endsWith("/v1") ? path : `${path}/v1`}/chat/completions`;
  return url.href;
}

export function parseModelProfiles(value: unknown): ModelApiProfile[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 20).flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const profile = item as Record<string, unknown>;
    if (typeof profile.id !== "string" || !profile.id.trim() || profile.id.length > 100 || ids.has(profile.id)) return [];
    if (typeof profile.name !== "string" || !profile.name.trim() || typeof profile.model !== "string" || !profile.model.trim() || typeof profile.baseUrl !== "string") return [];
    try { normalizeModelEndpoint(profile.baseUrl); } catch { return []; }
    ids.add(profile.id);
    return [{ id: profile.id.slice(0, 100), name: profile.name.trim().slice(0, 80), baseUrl: profile.baseUrl.trim().slice(0, 1000), model: profile.model.trim().slice(0, 200), requiresApiKey: profile.requiresApiKey === true }];
  });
}

/** Use a whitelist again at persistence/export boundaries, even for untyped callers. */
export function publicModelConfiguration(config: AppConfig): AppConfig {
  return { ...config, labs: { ...config.labs, modelApi: {
    enabled: config.labs.modelApi.enabled,
    profiles: parseModelProfiles(config.labs.modelApi.profiles),
  }, aiTranslation: {
    enabled: config.labs.aiTranslation.enabled,
    profileId: config.labs.aiTranslation.profileId,
    targetLanguage: config.labs.aiTranslation.targetLanguage,
  } } };
}

export function modelConnectionIdentity(profile: ModelApiProfile): string {
  return JSON.stringify([profile.id, normalizeModelEndpoint(profile.baseUrl), profile.model, profile.requiresApiKey]);
}
