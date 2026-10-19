export type Locale = "zh-CN" | "zh-TW" | "en";
export type ThemeMode = "light" | "dark" | "system";
export type BackgroundType = "none" | "image" | "video";
export type BackgroundFit = "fill" | "fit" | "stretch" | "tile" | "center";
export type DateFormat = "numeric" | "long" | "iso";
export type PaletteMode = "wallpaper" | "custom";
export type ThemeStrength = "soft" | "standard" | "vivid";
/** User-facing surface themes. `standard`/`glass` are accepted only while parsing legacy data. */
export type SurfaceMode = "minimal" | "material" | "liquid";
export type IconStyle = "auto" | "feather" | "material";
export type IconProvider = "feather" | "material";
export type QuickLinksDensity = "compact" | "standard" | "comfortable" | "advanced";
export type WeatherProviderId = "open-meteo";
export type WeatherTemperatureUnit = "celsius" | "fahrenheit";
export type WeatherRefreshMinutes = 0 | 15 | 20 | 30 | 60;
export type SuggestionProvider = "auto" | "baidu" | "bing" | "google" | "duckduckgo" | "custom";
export type SuggestionTransport = "auto" | "direct" | "allorigins" | "custom";
export type TranslationProvider = "baidu" | "google" | "bing" | "custom";
export type APlayerPosition = "left" | "right";
export type MusicSourceMode = "manual" | "meting";
export type MetingMatchMode = "song" | "playlist" | "album" | "search" | "artist";
export type TranslationLanguage = "zh-CN" | "zh-TW" | "en";

/** Public connection metadata only. Credentials never belong to AppConfig. */
export interface ModelApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  requiresApiKey: boolean;
}

export interface SearchEngine {
  id: string;
  name: string;
  urlTemplate: string;
  suggestionsEnabled?: boolean;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  iconAssetId?: string;
  openInNewTab: boolean;
  category?: string;
}

export interface TopAction {
  id: string;
  title: string;
  url: string;
  icon?: string;
  /** Optional provider for new actions; omitted legacy icons remain Feather icons. */
  iconProvider?: IconProvider;
  openInNewTab: boolean;
}

export interface WeatherConfig {
  enabled: boolean;
  provider: WeatherProviderId;
  location: string;
  latitude?: number;
  longitude?: number;
  autoLocate: boolean;
  temperatureUnit: WeatherTemperatureUnit;
  showIcon: boolean;
  showTemperature: boolean;
  showCondition: boolean;
  showLocation: boolean;
  refreshMinutes: WeatherRefreshMinutes;
}

export interface APlayerTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover?: string;
  lrc?: string;
}

export interface MetingConfig {
  enabled: boolean;
  apiBaseUrl: string;
  server: string;
  mode: MetingMatchMode;
  value: string;
}

export type QuoteProvider =
  | { type: "static"; text: string }
  | { type: "hitokoto"; fallback: string }
  | { type: "custom"; endpoint: string; textPath: string; fallback: string };

export interface AppConfig {
  version: 4;
  locale: Locale;
  siteIdentity: {
    name: string;
    avatarAssetId: "avatar" | null;
  };
  theme: {
    mode: ThemeMode;
  };
  clock: {
    timezone: string;
    useLocalTime: boolean;
    format24h: boolean;
    showSeconds: boolean;
    showNetworkWarning: boolean;
    dateFormat: DateFormat;
  };
  search: {
    defaultEngineId: string;
    engines: SearchEngine[];
    suggestionsEnabled: boolean;
    suggestionProvider: SuggestionProvider;
    suggestionApiUrl: string;
    suggestionTransport: SuggestionTransport;
    suggestionProxyUrl: string;
    translationEnabled: boolean;
    translationProvider: TranslationProvider;
    translationUrlTemplate: string;
  };
  quickLinks: QuickLink[];
  topActions: TopAction[];
  appearance: {
    backgroundType: BackgroundType;
    /** Optional remote default seeded for a new deployment configuration. */
    backgroundUrl?: string;
    backgroundFit: BackgroundFit;
    positionDesktop: string;
    positionMobile: string;
    focalX: number;
    focalY: number;
    blur: number;
    overlay: number;
    glassOpacity: number;
    glassBlur: number;
    glassTint: number;
    playBackgroundAudio: boolean;
    sakuraEnabled: boolean;
    paletteMode: PaletteMode;
    themeStrength: ThemeStrength;
    surfaceMode: SurfaceMode;
    iconStyle: IconStyle;
    accentColor: string;
    wallpaperPalette: string[];
    overallScale: number;
    moduleScale: {
      clock: number;
      quote: number;
      search: number;
      quickLinks: number;
    };
    moduleGap: number;
    composition: {
      x: number;
      y: number;
    };
    quickLinksStyle: {
      density: QuickLinksDensity;
      cardScale: number;
      iconScale: number;
      horizontalGap: number;
      verticalGap: number;
    };
  };
  content: {
    quote: QuoteProvider;
    visibility: {
      clock: boolean;
      date: boolean;
      quote: boolean;
      quickLinks: boolean;
      footer: boolean;
    };
    footer: {
      showLegal: boolean;
      showIcp: boolean;
      showPolice: boolean;
      showCopyright: boolean;
      copyrightText: string;
      icpText: string;
      icpUrl: string;
      policeText: string;
      policeUrl: string;
    };
    weather: WeatherConfig;
  };
  labs: {
    liveBackdropBlur: boolean;
    modelApi: {
      enabled: boolean;
      profiles: ModelApiProfile[];
    };
    aiTranslation: {
      enabled: boolean;
      profileId: string | null;
      targetLanguage: TranslationLanguage;
    };
    customCursor: {
      enabled: boolean;
      assetId: "cursor" | null;
      size: number | null;
      hotspotX: number;
      hotspotY: number;
    };
    aplayer: {
      enabled: boolean;
      position: APlayerPosition;
      source: MusicSourceMode;
      meting: MetingConfig;
      playlist: APlayerTrack[];
    };
  };
  general: {
    autoDownloadConfig: boolean;
    minimized: boolean;
    showMinimizeWarning: boolean;
    motionEnabled: boolean;
  };
}

export interface StoredBackgroundAsset {
  id: "visual" | "audio" | "avatar" | "cursor" | `quick-link-icon:${string}`;
  blob: Blob;
  mimeType: string;
  name: string;
  updatedAt: string;
}

export interface SerializedBackgroundAsset {
  mimeType: string;
  name: string;
  dataUrl: string;
}

export interface ConfigExportV4 {
  version: 4;
  exportedAt: string;
  config: AppConfig;
  background?: {
    visual?: SerializedBackgroundAsset;
    audio?: SerializedBackgroundAsset;
    avatar?: SerializedBackgroundAsset;
    cursor?: SerializedBackgroundAsset;
    quickLinkIcons?: Record<string, SerializedBackgroundAsset>;
  };
}
