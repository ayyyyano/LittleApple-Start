import type { AppConfig } from "@/types/config";
import { DEFAULT_BACKGROUND } from "@/lib/default-background";

export const DEFAULT_CONFIG: AppConfig = {
  version: 4,
  locale: "zh-CN",
  siteIdentity: { name: "LittleApple Start", avatarAssetId: null },
  theme: { mode: "system" },
  clock: {
    timezone: "Asia/Shanghai",
    useLocalTime: false,
    format24h: true,
    showSeconds: true,
    showNetworkWarning: true,
    dateFormat: "numeric",
  },
  search: {
    defaultEngineId: "bing",
    suggestionsEnabled: true,
    engines: [
      { id: "bing", name: "Bing", urlTemplate: "https://www.bing.com/search?q=%s" },
      { id: "google", name: "Google", urlTemplate: "https://www.google.com/search?q=%s" },
      { id: "baidu", name: "百度", urlTemplate: "https://www.baidu.com/s?wd=%s" },
    ],
  },
  quickLinks: [],
  topActions: [],
  appearance: {
    backgroundType: "none",
    backgroundFit: "fill",
    positionDesktop: "center center",
    positionMobile: "62% center",
    focalX: 50,
    focalY: 50,
    blur: 0,
    overlay: 20,
    glassOpacity: 80,
    glassBlur: 16,
    glassTint: 10,
    playBackgroundAudio: false,
    sakuraEnabled: false,
    paletteMode: "wallpaper",
    themeStrength: "standard",
    surfaceMode: "liquid",
    iconStyle: "auto",
    accentColor: DEFAULT_BACKGROUND.accentColor,
    wallpaperPalette: [...DEFAULT_BACKGROUND.palette],
    overallScale: 100,
    moduleScale: { clock: 100, quote: 100, search: 100, quickLinks: 100 },
    moduleGap: 100,
    composition: { x: 50, y: 50 },
    quickLinksStyle: {
      density: "standard",
      cardScale: 100,
      iconScale: 100,
      horizontalGap: 100,
      verticalGap: 100,
    },
  },
  content: {
    quote: { type: "hitokoto", fallback: "一株果树，多个树杈，N颗苹果。" },
    visibility: { clock: true, date: true, quote: true, quickLinks: true, footer: true },
    footer: {
      showLegal: true,
      showIcp: true,
      showPolice: true,
      showCopyright: true,
      copyrightText: "© 2016–2026 LittleApple Studio",
      icpText: "闽ICP备2026018137号",
      icpUrl: "https://beian.miit.gov.cn/",
      policeText: "闽公网安备35070202100245号",
      policeUrl: "https://beian.mps.gov.cn/#/query/webSearch?code=35070202100245",
    },
    weather: {
      enabled: false,
      provider: "open-meteo",
      location: "Xiamen",
      showIcon: true,
      showTemperature: true,
      showCondition: true,
      showLocation: false,
      refreshMinutes: 30,
    },
  },
  labs: {
    aplayer: {
      enabled: false,
      position: "left",
      source: "manual",
      meting: { enabled: false, apiBaseUrl: "", server: "", mode: "song", value: "" },
      playlist: [],
    },
  },
  general: {
    autoDownloadConfig: false,
    minimized: false,
    showMinimizeWarning: true,
    motionEnabled: true,
  },
};

export function cloneDefaultConfig(): AppConfig {
  return structuredClone(DEFAULT_CONFIG);
}
