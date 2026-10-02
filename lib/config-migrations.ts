import { cloneDefaultConfig } from "@/lib/default-config";
import { isSafeHttpUrl } from "@/lib/validation";
import type { AppConfig, Locale, QuickLink, SearchEngine } from "@/types/config";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function legacyId(name: string, index: number): string {
  const slug = name
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
  return `legacy-${slug || "engine"}-${index}`;
}

function focalPointFromPosition(value: string): { x: number; y: number } {
  const [horizontal = "center", vertical = "center"] = value.trim().split(/\s+/);
  const axis = (part: string, start: string, end: string) => {
    if (part === start) return 0;
    if (part === end) return 100;
    if (part.endsWith("%") && Number.isFinite(Number.parseFloat(part))) return Math.min(100, Math.max(0, Number.parseFloat(part)));
    return 50;
  };
  return { x: axis(horizontal, "left", "right"), y: axis(vertical, "top", "bottom") };
}

export function migrateLegacyConfig(input: unknown): AppConfig {
  const result = cloneDefaultConfig();
  if (!isRecord(input)) return result;

  const legacyEngines = Array.isArray(input.searchEngines) ? input.searchEngines : [];
  const engines: SearchEngine[] = legacyEngines.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.url !== "string") return [];
    if (!item.name.trim() || !isSafeHttpUrl(item.url)) return [];
    return [{ id: legacyId(item.name, index), name: item.name.trim(), urlTemplate: item.url.trim() }];
  });
  if (engines.length > 0) result.search.engines = engines;

  const selectedUrl = typeof input.selectedSearchEngine === "string" ? input.selectedSearchEngine : "";
  const selected = result.search.engines.find((engine) => engine.urlTemplate === selectedUrl);
  result.search.defaultEngineId = selected?.id ?? result.search.engines[0]?.id ?? "bing";

  const locale = input.selectedLanguage;
  if (locale === "zh-CN" || locale === "zh-TW" || locale === "en") result.locale = locale as Locale;
  if (typeof input.timezone === "string" && input.timezone.trim()) result.clock.timezone = input.timezone;
  if (typeof input.useLocalTime === "boolean") result.clock.useLocalTime = input.useLocalTime;
  if (typeof input.showLocalTimeWarning === "boolean") result.clock.showNetworkWarning = input.showLocalTimeWarning;
  if (typeof input.playBackgroundAudio === "boolean") {
    result.appearance.playBackgroundAudio = input.playBackgroundAudio;
  }
  if (typeof input.autoSaveConfig === "boolean") result.general.autoDownloadConfig = input.autoSaveConfig;
  if (typeof input.minimized === "boolean") result.general.minimized = input.minimized;
  if (typeof input.showMinimizeWarning === "boolean") {
    result.general.showMinimizeWarning = input.showMinimizeWarning;
  }
  return result;
}

export function migrateV2Config(input: unknown): AppConfig {
  const result = cloneDefaultConfig();
  if (!isRecord(input) || input.version !== 2) return result;

  if (input.locale === "zh-CN" || input.locale === "zh-TW" || input.locale === "en") result.locale = input.locale;
  if (isRecord(input.theme) && (input.theme.mode === "light" || input.theme.mode === "dark" || input.theme.mode === "system")) {
    result.theme.mode = input.theme.mode;
  }

  if (isRecord(input.clock)) {
    if (typeof input.clock.timezone === "string" && input.clock.timezone.trim()) result.clock.timezone = input.clock.timezone;
    if (typeof input.clock.useLocalTime === "boolean") result.clock.useLocalTime = input.clock.useLocalTime;
    if (typeof input.clock.format24h === "boolean") result.clock.format24h = input.clock.format24h;
    if (typeof input.clock.showSeconds === "boolean") result.clock.showSeconds = input.clock.showSeconds;
    if (typeof input.clock.showNetworkWarning === "boolean") result.clock.showNetworkWarning = input.clock.showNetworkWarning;
  }

  if (isRecord(input.search)) {
    const search = input.search;
    const engines = Array.isArray(search.engines) ? search.engines.flatMap((item): SearchEngine[] => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.urlTemplate !== "string") return [];
      if (!item.id || !item.name.trim() || !isSafeHttpUrl(item.urlTemplate)) return [];
      return [{ id: item.id, name: item.name.trim(), urlTemplate: item.urlTemplate }];
    }) : [];
    if (engines.length > 0) {
      result.search.engines = engines;
      result.search.defaultEngineId = typeof search.defaultEngineId === "string" && engines.some((item) => item.id === search.defaultEngineId)
        ? search.defaultEngineId
        : engines[0].id;
    }
    if (typeof search.suggestionsEnabled === "boolean") result.search.suggestionsEnabled = search.suggestionsEnabled;
  }

  if (Array.isArray(input.quickLinks)) {
    result.quickLinks = input.quickLinks.flatMap((item): QuickLink[] => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.url !== "string") return [];
      if (!item.id || !item.title.trim() || !isSafeHttpUrl(item.url)) return [];
      return [{
        id: item.id,
        title: item.title.trim(),
        url: item.url,
        icon: typeof item.icon === "string" && isSafeHttpUrl(item.icon) ? item.icon : undefined,
        openInNewTab: item.openInNewTab !== false,
        category: typeof item.category === "string" ? item.category : undefined,
      }];
    });
  }

  if (isRecord(input.appearance)) {
    const appearance = input.appearance;
    if (appearance.backgroundType === "none" || appearance.backgroundType === "image" || appearance.backgroundType === "video") {
      result.appearance.backgroundType = appearance.backgroundType;
    }
    if (appearance.backgroundFit === "cover") result.appearance.backgroundFit = "fill";
    if (appearance.backgroundFit === "contain") result.appearance.backgroundFit = "fit";
    if (typeof appearance.positionDesktop === "string") {
      result.appearance.positionDesktop = appearance.positionDesktop;
      const focal = focalPointFromPosition(appearance.positionDesktop);
      result.appearance.focalX = focal.x;
      result.appearance.focalY = focal.y;
    }
    if (typeof appearance.positionMobile === "string") result.appearance.positionMobile = appearance.positionMobile;
    if (typeof appearance.blur === "number") result.appearance.blur = Math.min(24, Math.max(0, appearance.blur));
    if (typeof appearance.overlay === "number") result.appearance.overlay = Math.min(80, Math.max(0, appearance.overlay));
    if (typeof appearance.glassOpacity === "number") result.appearance.glassOpacity = Math.min(100, Math.max(45, appearance.glassOpacity));
    if (typeof appearance.glassBlur === "number") result.appearance.glassBlur = Math.min(32, Math.max(0, appearance.glassBlur));
    if (typeof appearance.playBackgroundAudio === "boolean") result.appearance.playBackgroundAudio = appearance.playBackgroundAudio;
    if (typeof appearance.sakuraEnabled === "boolean") result.appearance.sakuraEnabled = appearance.sakuraEnabled;
  }

  if (isRecord(input.general)) {
    if (typeof input.general.autoDownloadConfig === "boolean") result.general.autoDownloadConfig = input.general.autoDownloadConfig;
    if (typeof input.general.minimized === "boolean") result.general.minimized = input.general.minimized;
    if (typeof input.general.showMinimizeWarning === "boolean") result.general.showMinimizeWarning = input.general.showMinimizeWarning;
  }

  return result;
}

export function isLegacyExport(value: unknown): value is { config: unknown; background?: unknown } {
  return isRecord(value) && "config" in value && !("version" in value);
}
