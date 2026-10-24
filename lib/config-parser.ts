import { cloneDefaultConfig } from "@/lib/default-config";
import { isLegacyExport, migrateLegacyConfig, migrateV2Config } from "@/lib/config-migrations";
import { isHexColor, isSafeHttpUrl } from "@/lib/validation";
import { isSafeDeploymentUrl } from "@/lib/deployment-defaults";
import { parseModelProfiles } from "@/lib/model-api-config";
import { normalizeMetingServer } from "@/lib/meting-config";
import type {
  AppConfig,
  APlayerTrack,
  ConfigExportV4,
  DateFormat,
  Locale,
  MetingMatchMode,
  PaletteMode,
  QuickLink,
  QuickLinksDensity,
  QuoteProvider,
  SearchEngine,
  SerializedBackgroundAsset,
  ThemeMode,
  TopAction,
} from "@/types/config";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberIn(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringOr(value: unknown, fallback: string, maxLength = 160): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function safeUrlOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" || isSafeHttpUrl(trimmed) ? trimmed.slice(0, 500) : fallback;
}

function optionalCoordinate(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

function parseEngines(value: unknown): SearchEngine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    if (typeof item.id !== "string" || typeof item.name !== "string" || typeof item.urlTemplate !== "string") return [];
    if (!item.id || !item.name.trim() || !isSafeHttpUrl(item.urlTemplate)) return [];
    return [{ id: item.id, name: item.name.trim(), urlTemplate: item.urlTemplate,
      ...(typeof item.suggestionsEnabled === "boolean" ? { suggestionsEnabled: item.suggestionsEnabled } : {}),
    }];
  });
}

function parseQuickLinks(value: unknown): QuickLink[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 48).flatMap((item) => {
    if (!isRecord(item)) return [];
    if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.url !== "string") return [];
    if (!item.id || !item.title.trim() || !isSafeHttpUrl(item.url)) return [];
    return [{
      id: item.id,
      title: item.title.trim(),
      url: item.url,
      icon: typeof item.icon === "string" && isSafeHttpUrl(item.icon) ? item.icon : undefined,
      iconAssetId: typeof item.iconAssetId === "string" && /^quick-link-icon:[A-Za-z0-9_-]+$/.test(item.iconAssetId) ? item.iconAssetId : undefined,
      category: typeof item.category === "string" ? item.category : undefined,
      openInNewTab: item.openInNewTab !== false,
    }];
  });
}

function parseTopActions(value: unknown): TopAction[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((item) => {
    if (!isRecord(item)) return [];
    if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.url !== "string") return [];
    if (!item.id || !item.title.trim() || !isSafeHttpUrl(item.url)) return [];
    return [{
      id: item.id,
      title: item.title.trim(),
      url: item.url,
      icon: typeof item.icon === "string" && item.icon.trim() ? item.icon.trim().slice(0, 40) : undefined,
      iconProvider: item.iconProvider === "material" || item.iconProvider === "feather" ? item.iconProvider : undefined,
      openInNewTab: item.openInNewTab !== false,
    }];
  });
}

function parseAPlayerPlaylist(value: unknown): APlayerTrack[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).flatMap((item) => {
    if (!isRecord(item)) return [];
    if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.artist !== "string" || typeof item.url !== "string") return [];
    if (!item.id || !item.title.trim() || !isSafeHttpUrl(item.url)) return [];
    const cover = typeof item.cover === "string" && isSafeHttpUrl(item.cover) ? item.cover : undefined;
    const lrc = typeof item.lrc === "string" && isSafeHttpUrl(item.lrc) ? item.lrc : undefined;
    return [{ id: item.id, title: item.title.trim().slice(0, 80), artist: item.artist.trim().slice(0, 80), url: item.url, cover, lrc }];
  });
}

function parseQuoteProvider(value: unknown, fallback: QuoteProvider): QuoteProvider {
  if (!isRecord(value)) return fallback;
  if (value.type === "static" && typeof value.text === "string" && value.text.trim()) {
    return { type: "static", text: value.text.trim().slice(0, 280) };
  }
  const fallbackText = typeof value.fallback === "string" && value.fallback.trim()
    ? value.fallback.trim().slice(0, 280)
    : "一株果树，多个树杈，N颗苹果。";
  if (value.type === "hitokoto") return { type: "hitokoto", fallback: fallbackText };
  if (
    value.type === "custom" &&
    typeof value.endpoint === "string" &&
    isSafeHttpUrl(value.endpoint) &&
    typeof value.textPath === "string" &&
    /^[A-Za-z0-9_$.-]+$/.test(value.textPath)
  ) {
    return { type: "custom", endpoint: value.endpoint, textPath: value.textPath, fallback: fallbackText };
  }
  return fallback;
}

export function parseCurrentConfig(value: unknown): AppConfig {
  if (!isRecord(value) || (value.version !== 3 && value.version !== 4)) throw new Error("UNSUPPORTED_CONFIG_VERSION");
  const fallback = cloneDefaultConfig();
  const result = cloneDefaultConfig();

  if (value.locale === "zh-CN" || value.locale === "zh-TW" || value.locale === "en") result.locale = value.locale as Locale;
  if (isRecord(value.siteIdentity)) {
    if (typeof value.siteIdentity.name === "string" && value.siteIdentity.name.trim()) {
      result.siteIdentity.name = value.siteIdentity.name.trim().slice(0, 60);
    }
    result.siteIdentity.avatarAssetId = value.siteIdentity.avatarAssetId === "avatar" ? "avatar" : null;
  }
  if (isRecord(value.theme) && ["light", "dark", "system"].includes(String(value.theme.mode))) result.theme.mode = value.theme.mode as ThemeMode;

  if (isRecord(value.clock)) {
    if (typeof value.clock.timezone === "string" && value.clock.timezone) result.clock.timezone = value.clock.timezone;
    result.clock.useLocalTime = booleanOr(value.clock.useLocalTime, fallback.clock.useLocalTime);
    result.clock.format24h = booleanOr(value.clock.format24h, fallback.clock.format24h);
    result.clock.showSeconds = booleanOr(value.clock.showSeconds, fallback.clock.showSeconds);
    result.clock.showNetworkWarning = booleanOr(value.clock.showNetworkWarning, fallback.clock.showNetworkWarning);
    if (["numeric", "long", "iso"].includes(String(value.clock.dateFormat))) result.clock.dateFormat = value.clock.dateFormat as DateFormat;
  }

  if (isRecord(value.search)) {
    const search = value.search;
    const engines = parseEngines(search.engines);
    if (engines.length === 0) throw new Error("INVALID_SEARCH_ENGINES");
    result.search.engines = engines;
    result.search.defaultEngineId = typeof search.defaultEngineId === "string" && engines.some((item) => item.id === search.defaultEngineId)
      ? search.defaultEngineId
      : engines[0].id;
    result.search.suggestionsEnabled = booleanOr(search.suggestionsEnabled, fallback.search.suggestionsEnabled);
    if (["auto", "baidu", "bing", "google", "duckduckgo", "custom"].includes(String(search.suggestionProvider))) {
      result.search.suggestionProvider = search.suggestionProvider as AppConfig["search"]["suggestionProvider"];
    }
    result.search.suggestionApiUrl = safeUrlOr(search.suggestionApiUrl, fallback.search.suggestionApiUrl);
    if (["auto", "direct", "allorigins", "custom"].includes(String(search.suggestionTransport))) {
      result.search.suggestionTransport = search.suggestionTransport === "allorigins" ? "auto" : search.suggestionTransport as AppConfig["search"]["suggestionTransport"];
    }
    result.search.suggestionProxyUrl = safeUrlOr(search.suggestionProxyUrl, "");
    result.search.translationEnabled = booleanOr(search.translationEnabled, fallback.search.translationEnabled);
    if (["baidu", "google", "bing", "custom"].includes(String(search.translationProvider))) {
      result.search.translationProvider = search.translationProvider as AppConfig["search"]["translationProvider"];
    }
    result.search.translationUrlTemplate = safeUrlOr(search.translationUrlTemplate, fallback.search.translationUrlTemplate);
  }

  result.quickLinks = parseQuickLinks(value.quickLinks);
  result.topActions = parseTopActions(value.topActions);

  if (isRecord(value.appearance)) {
    const appearance = value.appearance;
    if (["none", "image", "video"].includes(String(appearance.backgroundType))) result.appearance.backgroundType = appearance.backgroundType as AppConfig["appearance"]["backgroundType"];
    if (typeof appearance.backgroundUrl === "string" && isSafeDeploymentUrl(appearance.backgroundUrl)) result.appearance.backgroundUrl = appearance.backgroundUrl.trim().slice(0, 500);
    const fitMap = { cover: "fill", contain: "fit", fill: "fill", fit: "fit", stretch: "stretch", tile: "tile", center: "center" } as const;
    if (typeof appearance.backgroundFit === "string" && appearance.backgroundFit in fitMap) {
      result.appearance.backgroundFit = fitMap[appearance.backgroundFit as keyof typeof fitMap];
    }
    if (typeof appearance.positionDesktop === "string") result.appearance.positionDesktop = appearance.positionDesktop;
    if (typeof appearance.positionMobile === "string") result.appearance.positionMobile = appearance.positionMobile;
    result.appearance.focalX = numberIn(appearance.focalX, fallback.appearance.focalX, 0, 100);
    result.appearance.focalY = numberIn(appearance.focalY, fallback.appearance.focalY, 0, 100);
    result.appearance.blur = numberIn(appearance.blur, fallback.appearance.blur, 0, 24);
    result.appearance.overlay = numberIn(appearance.overlay, fallback.appearance.overlay, 0, 68);
    result.appearance.glassOpacity = numberIn(appearance.glassOpacity, fallback.appearance.glassOpacity, 45, 96);
    result.appearance.glassBlur = numberIn(appearance.glassBlur, fallback.appearance.glassBlur, 0, 28);
    result.appearance.glassTint = numberIn(appearance.glassTint, fallback.appearance.glassTint, 0, 18);
    result.appearance.playBackgroundAudio = booleanOr(appearance.playBackgroundAudio, fallback.appearance.playBackgroundAudio);
    result.appearance.sakuraEnabled = booleanOr(appearance.sakuraEnabled, fallback.appearance.sakuraEnabled);
    if (appearance.paletteMode === "wallpaper" || appearance.paletteMode === "custom") result.appearance.paletteMode = appearance.paletteMode as PaletteMode;
    if (appearance.themeStrength === "soft" || appearance.themeStrength === "standard" || appearance.themeStrength === "vivid") result.appearance.themeStrength = appearance.themeStrength;
    if (appearance.surfaceMode === "minimal" || appearance.surfaceMode === "material" || appearance.surfaceMode === "liquid") result.appearance.surfaceMode = appearance.surfaceMode;
    // `standard` and `glass` were the former complete surface theme. Keep old
    // exports/imports readable while converging runtime state on Material.
    if (appearance.surfaceMode === "standard" || appearance.surfaceMode === "glass") result.appearance.surfaceMode = "material";
    if (appearance.iconStyle === "auto" || appearance.iconStyle === "feather" || appearance.iconStyle === "material") result.appearance.iconStyle = appearance.iconStyle;
    if (typeof appearance.accentColor === "string" && isHexColor(appearance.accentColor)) result.appearance.accentColor = appearance.accentColor.toLowerCase();
    if (Array.isArray(appearance.wallpaperPalette)) {
      const palette = appearance.wallpaperPalette.filter((item): item is string => typeof item === "string" && isHexColor(item)).slice(0, 8);
      if (palette.length > 0) result.appearance.wallpaperPalette = palette.map((item) => item.toLowerCase());
    }
    result.appearance.overallScale = numberIn(appearance.overallScale, fallback.appearance.overallScale, 80, 120);
    result.appearance.moduleGap = numberIn(appearance.moduleGap, fallback.appearance.moduleGap, 70, 150);
    if (isRecord(appearance.moduleScale)) {
      result.appearance.moduleScale.clock = numberIn(appearance.moduleScale.clock, fallback.appearance.moduleScale.clock, 70, 140);
      result.appearance.moduleScale.quote = numberIn(appearance.moduleScale.quote, fallback.appearance.moduleScale.quote, 80, 130);
      result.appearance.moduleScale.search = numberIn(appearance.moduleScale.search, fallback.appearance.moduleScale.search, 80, 120);
      result.appearance.moduleScale.quickLinks = numberIn(appearance.moduleScale.quickLinks, fallback.appearance.moduleScale.quickLinks, 75, 130);
    }
    if (isRecord(appearance.composition)) {
      result.appearance.composition.x = numberIn(appearance.composition.x, fallback.appearance.composition.x, 35, 65);
      result.appearance.composition.y = numberIn(appearance.composition.y, fallback.appearance.composition.y, 35, 65);
    }
    if (isRecord(appearance.quickLinksStyle)) {
      const style = appearance.quickLinksStyle;
      if (["compact", "standard", "comfortable", "advanced"].includes(String(style.density))) result.appearance.quickLinksStyle.density = style.density as QuickLinksDensity;
      result.appearance.quickLinksStyle.cardScale = numberIn(style.cardScale, fallback.appearance.quickLinksStyle.cardScale, 75, 130);
      result.appearance.quickLinksStyle.iconScale = numberIn(style.iconScale, fallback.appearance.quickLinksStyle.iconScale, 75, 140);
      result.appearance.quickLinksStyle.horizontalGap = numberIn(style.horizontalGap, fallback.appearance.quickLinksStyle.horizontalGap, 70, 150);
      result.appearance.quickLinksStyle.verticalGap = numberIn(style.verticalGap, fallback.appearance.quickLinksStyle.verticalGap, 70, 150);
    }
  }

  if (isRecord(value.content)) {
    result.content.quote = parseQuoteProvider(value.content.quote, fallback.content.quote);
    if (isRecord(value.content.visibility)) {
      result.content.visibility.clock = booleanOr(value.content.visibility.clock, fallback.content.visibility.clock);
      result.content.visibility.date = booleanOr(value.content.visibility.date, fallback.content.visibility.date);
      result.content.visibility.quote = booleanOr(value.content.visibility.quote, fallback.content.visibility.quote);
      result.content.visibility.quickLinks = booleanOr(value.content.visibility.quickLinks, fallback.content.visibility.quickLinks);
      result.content.visibility.footer = booleanOr(value.content.visibility.footer, fallback.content.visibility.footer);
    }
    if (isRecord(value.content.footer)) {
      const footer = value.content.footer;
      result.content.footer.showLegal = booleanOr(footer.showLegal, fallback.content.footer.showLegal);
      result.content.footer.showIcp = booleanOr(footer.showIcp, result.content.footer.showLegal);
      result.content.footer.showPolice = booleanOr(footer.showPolice, result.content.footer.showLegal);
      result.content.footer.showCopyright = booleanOr(footer.showCopyright, fallback.content.footer.showCopyright);
      result.content.footer.copyrightText = stringOr(footer.copyrightText, fallback.content.footer.copyrightText);
      result.content.footer.icpText = stringOr(footer.icpText, fallback.content.footer.icpText);
      result.content.footer.icpUrl = safeUrlOr(footer.icpUrl, fallback.content.footer.icpUrl);
      result.content.footer.policeText = stringOr(footer.policeText, fallback.content.footer.policeText);
      result.content.footer.policeUrl = safeUrlOr(footer.policeUrl, fallback.content.footer.policeUrl);
    }
    if (isRecord(value.content.weather)) {
      const weather = value.content.weather;
      result.content.weather.enabled = booleanOr(weather.enabled, fallback.content.weather.enabled);
      if (weather.provider === "open-meteo") result.content.weather.provider = weather.provider;
      if (typeof weather.location === "string" && weather.location.trim()) result.content.weather.location = weather.location.trim().slice(0, 80);
      const latitude = optionalCoordinate(weather.latitude, -90, 90);
      const longitude = optionalCoordinate(weather.longitude, -180, 180);
      if (latitude !== undefined && longitude !== undefined) {
        result.content.weather.latitude = latitude;
        result.content.weather.longitude = longitude;
      }
      result.content.weather.autoLocate = booleanOr(weather.autoLocate, fallback.content.weather.autoLocate);
      if (weather.temperatureUnit === "celsius" || weather.temperatureUnit === "fahrenheit") result.content.weather.temperatureUnit = weather.temperatureUnit;
      result.content.weather.showIcon = booleanOr(weather.showIcon, fallback.content.weather.showIcon);
      result.content.weather.showTemperature = booleanOr(weather.showTemperature, fallback.content.weather.showTemperature);
      result.content.weather.showCondition = booleanOr(weather.showCondition, fallback.content.weather.showCondition);
      result.content.weather.showLocation = booleanOr(weather.showLocation, fallback.content.weather.showLocation);
      if (weather.refreshMinutes === 0 || weather.refreshMinutes === 15 || weather.refreshMinutes === 20 || weather.refreshMinutes === 30 || weather.refreshMinutes === 60) result.content.weather.refreshMinutes = weather.refreshMinutes;
    }
  }

  if (isRecord(value.labs)) {
    result.labs.liveBackdropBlur = booleanOr(value.labs.liveBackdropBlur, false);
    if (isRecord(value.labs.modelApi)) {
      result.labs.modelApi.enabled = booleanOr(value.labs.modelApi.enabled, false);
      result.labs.modelApi.profiles = parseModelProfiles(value.labs.modelApi.profiles);
    }
    if (isRecord(value.labs.aiTranslation)) {
      const translation = value.labs.aiTranslation;
      result.labs.aiTranslation.enabled = booleanOr(translation.enabled, false);
      result.labs.aiTranslation.profileId = typeof translation.profileId === "string" && result.labs.modelApi.profiles.some((profile) => profile.id === translation.profileId) ? translation.profileId : null;
      if (translation.targetLanguage === "zh-CN" || translation.targetLanguage === "zh-TW" || translation.targetLanguage === "en") result.labs.aiTranslation.targetLanguage = translation.targetLanguage;
    }
    if (isRecord(value.labs.customCursor)) {
      result.labs.customCursor.enabled = booleanOr(value.labs.customCursor.enabled, fallback.labs.customCursor.enabled);
      result.labs.customCursor.assetId = value.labs.customCursor.assetId === "cursor" ? "cursor" : null;
      result.labs.customCursor.size = typeof value.labs.customCursor.size === "number" ? numberIn(value.labs.customCursor.size, 32, 16, 128) : null;
      result.labs.customCursor.hotspotX = numberIn(value.labs.customCursor.hotspotX, 0, 0, 127);
      result.labs.customCursor.hotspotY = numberIn(value.labs.customCursor.hotspotY, 0, 0, 127);
    }
    if (isRecord(value.labs.aplayer)) {
      const aplayer = value.labs.aplayer;
      result.labs.aplayer.enabled = booleanOr(aplayer.enabled, fallback.labs.aplayer.enabled);
      if (aplayer.position === "left" || aplayer.position === "right") result.labs.aplayer.position = aplayer.position;
      if (aplayer.source === "manual" || aplayer.source === "meting") result.labs.aplayer.source = aplayer.source;
      if (isRecord(aplayer.meting)) {
        const meting = aplayer.meting;
        result.labs.aplayer.meting.enabled = booleanOr(meting.enabled, fallback.labs.aplayer.meting.enabled);
        result.labs.aplayer.meting.apiBaseUrl = safeUrlOr(meting.apiBaseUrl, fallback.labs.aplayer.meting.apiBaseUrl);
        result.labs.aplayer.meting.server = normalizeMetingServer(stringOr(meting.server, fallback.labs.aplayer.meting.server, 40));
        if (["song", "playlist", "album", "search", "artist"].includes(String(meting.mode))) {
          result.labs.aplayer.meting.mode = meting.mode as MetingMatchMode;
        }
        result.labs.aplayer.meting.value = stringOr(meting.value, fallback.labs.aplayer.meting.value, 200);
      }
      result.labs.aplayer.playlist = parseAPlayerPlaylist(aplayer.playlist);
    }
  }

  if (isRecord(value.general)) {
    result.general.autoDownloadConfig = booleanOr(value.general.autoDownloadConfig, fallback.general.autoDownloadConfig);
    result.general.minimized = booleanOr(value.general.minimized, fallback.general.minimized);
    result.general.showMinimizeWarning = booleanOr(value.general.showMinimizeWarning, fallback.general.showMinimizeWarning);
    result.general.motionEnabled = booleanOr(value.general.motionEnabled, fallback.general.motionEnabled);
  }
  return result;
}

function parseAsset(value: unknown, allowedType: RegExp): SerializedBackgroundAsset | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.mimeType !== "string" || typeof value.name !== "string" || typeof value.dataUrl !== "string") return undefined;
  if (!allowedType.test(value.mimeType) || !value.dataUrl.startsWith("data:")) return undefined;
  return { mimeType: value.mimeType, name: value.name, dataUrl: value.dataUrl };
}

function parseBackground(value: unknown) {
  const quickLinkIcons: Record<string, SerializedBackgroundAsset> = {};
  if (isRecord(value) && isRecord(value.quickLinkIcons)) {
    Object.entries(value.quickLinkIcons).slice(0, 48).forEach(([id, asset]) => {
      if (!/^quick-link-icon:[A-Za-z0-9_-]+$/.test(id)) return;
      const parsed = parseAsset(asset, /^image\//);
      if (parsed) quickLinkIcons[id] = parsed;
    });
  }
  return isRecord(value)
    ? {
      visual: parseAsset(value.visual, /^(image|video)\//),
      audio: parseAsset(value.audio, /^audio\//),
      avatar: parseAsset(value.avatar, /^image\//),
      cursor: parseAsset(value.cursor, /^image\//),
      quickLinkIcons,
    }
    : undefined;
}

export function parseConfigFile(text: string): ConfigExportV4 {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (isLegacyExport(raw)) {
    const legacyBackground = isRecord(raw.background) && typeof raw.background.type === "string" && typeof raw.background.data === "string"
      ? { mimeType: raw.background.type, name: `legacy-background.${raw.background.type.split("/")[1] || "bin"}`, dataUrl: raw.background.data }
      : undefined;
    const visual = legacyBackground && /^(image|video)\//.test(legacyBackground.mimeType) ? legacyBackground : undefined;
    const audio = legacyBackground && /^audio\//.test(legacyBackground.mimeType) ? legacyBackground : undefined;
    const config = migrateLegacyConfig(raw.config);
    if (visual) config.appearance.backgroundType = visual.mimeType.startsWith("video/") ? "video" : "image";
    return { version: 4, exportedAt: new Date().toISOString(), config, background: { visual, audio } };
  }

  if (!isRecord(raw) || !isRecord(raw.config)) throw new Error("UNSUPPORTED_CONFIG_VERSION");
  const background = parseBackground(raw.background);
  const config = raw.version === 4 || raw.version === 3 ? parseCurrentConfig(raw.config) : raw.version === 2 ? migrateV2Config(raw.config) : null;
  if (!config) throw new Error("UNSUPPORTED_CONFIG_VERSION");
  config.appearance.backgroundType = background?.visual
    ? background.visual.mimeType.startsWith("video/") ? "video" : "image"
    : "none";
  config.siteIdentity.avatarAssetId = background?.avatar ? "avatar" : null;
  return {
    version: 4,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    config,
    background,
  };
}
