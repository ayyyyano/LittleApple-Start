import type { IconProvider, IconStyle, SurfaceMode } from "@/types/config";

export type SemanticIconName =
  | "settings" | "home" | "search" | "add" | "edit" | "delete" | "close" | "check" | "menu"
  | "back" | "forward" | "appearance" | "content" | "data" | "about" | "clock" | "calendar"
  | "weather" | "quote" | "music" | "audio" | "play" | "pause" | "link" | "externalLink" | "upload"
  | "download" | "reset" | "light" | "dark" | "system" | "palette" | "more" | "drag"
  | "info" | "eye" | "arrowUp" | "arrowDown" | "chevronDown" | "chevronUp" | "alert" | "refresh" | "image" | "video";

export function normalizeIconStyle(value: unknown): IconStyle {
  return value === "feather" || value === "material" || value === "auto" ? value : "auto";
}

export function resolveIconProvider(style: IconStyle, theme: SurfaceMode): IconProvider {
  if (style === "feather") return "feather";
  if (style === "material") return "material";
  return theme === "material" ? "material" : "feather";
}

/** Explicit semantic names avoid guessing between Feather and Material Symbols. */
export const MATERIAL_SYMBOL_NAMES: Record<SemanticIconName, string> = {
  settings: "settings", home: "home", search: "search", add: "add", edit: "edit", delete: "delete", close: "close", check: "check", menu: "menu",
  back: "arrow_back", forward: "arrow_forward", appearance: "palette", content: "widgets", data: "database", about: "info", clock: "schedule", calendar: "calendar_month",
  weather: "cloud", quote: "format_quote", music: "music_note", audio: "audio_file", play: "play_arrow", pause: "pause", link: "link", externalLink: "open_in_new", upload: "upload", download: "download",
  reset: "restart_alt", light: "light_mode", dark: "dark_mode", system: "desktop_windows", palette: "palette", more: "more_horiz", drag: "drag_indicator", info: "info", eye: "visibility",
  arrowUp: "arrow_upward", arrowDown: "arrow_downward", chevronDown: "expand_more", chevronUp: "expand_less", alert: "warning", refresh: "refresh", image: "image", video: "video_file",
};

export function isSemanticIconName(value: string | undefined): value is SemanticIconName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MATERIAL_SYMBOL_NAMES, value);
}

/** Names accepted for user-defined Material actions in addition to semantics. */
export function isMaterialIconName(value: string | undefined): boolean {
  return isSemanticIconName(value) || value === "public";
}
