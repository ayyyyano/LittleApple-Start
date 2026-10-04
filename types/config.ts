export type Locale = "zh-CN" | "zh-TW" | "en";
export type ThemeMode = "light" | "dark" | "system";
export type BackgroundType = "none" | "image" | "video";
export type BackgroundFit = "fill" | "fit" | "stretch" | "tile" | "center";
export type DateFormat = "numeric" | "long" | "iso";
export type PaletteMode = "wallpaper" | "custom";
export type ThemeStrength = "soft" | "standard" | "vivid";
export type SurfaceMode = "minimal" | "glass" | "liquid";
export type QuickLinksDensity = "compact" | "standard" | "comfortable" | "advanced";
export type WeatherProviderId = "open-meteo";
export type APlayerPosition = "left" | "right";
export type MusicSourceMode = "manual" | "meting";
export type MetingMatchMode = "song" | "playlist" | "album" | "search" | "artist";

export interface SearchEngine {
  id: string;
  name: string;
  urlTemplate: string;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  openInNewTab: boolean;
  category?: string;
}

export interface TopAction {
  id: string;
  title: string;
  url: string;
  icon?: string;
  openInNewTab: boolean;
}

export interface WeatherConfig {
  enabled: boolean;
  provider: WeatherProviderId;
  location: string;
  showIcon: boolean;
  showTemperature: boolean;
  showCondition: boolean;
  showLocation: boolean;
  refreshMinutes: 20 | 30 | 60;
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
  };
  quickLinks: QuickLink[];
  topActions: TopAction[];
  appearance: {
    backgroundType: BackgroundType;
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
  id: "visual" | "audio" | "avatar";
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
  };
}
