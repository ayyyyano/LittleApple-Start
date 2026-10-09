"use client";

import { Activity, AlertTriangle, Aperture, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Calendar, Check, ChevronDown, ChevronUp, Clock, Database, Download, Edit2, ExternalLink, Eye, Home, Image as ImageIcon, Info, Link2, Menu, Monitor, MoreHorizontal, Music, Pause, Play, Plus, RefreshCw, RotateCcw, Search, Settings, Sliders, Trash2, Upload, Video, X, type Icon } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { resolveIconProvider, type SemanticIconName } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { IconProvider } from "@/types/config";

const GripVertical: Icon = ({ color = "currentColor", size = 24, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
  </svg>
);

const FEATHER: Record<SemanticIconName, Icon> = {
  settings: Settings, home: Home, search: Search, add: Plus, edit: Edit2, delete: Trash2, close: X, check: Check, menu: Menu,
  back: ArrowLeft, forward: ArrowRight, appearance: Sliders, content: Clock, data: Database, about: Info, clock: Clock, calendar: Calendar,
  weather: Activity, quote: Info, music: Music, audio: Music, play: Play, pause: Pause, link: Link2, externalLink: ExternalLink, upload: Upload, download: Download,
  reset: RotateCcw, light: Activity, dark: Activity, system: Monitor, palette: Aperture, more: MoreHorizontal, drag: GripVertical, info: Info, eye: Eye,
  arrowUp: ArrowUp, arrowDown: ArrowDown, chevronDown: ChevronDown, chevronUp: ChevronUp, alert: AlertTriangle, refresh: RefreshCw, image: ImageIcon, video: Video,
};

// A small bundled Material Symbols-compatible path registry. It is intentionally
// local/offline and only contains symbols used by the application shell.
const PATHS: Partial<Record<SemanticIconName, string>> = {
  settings: "M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65-2-3.46-2.49 1a7.35 7.35 0 0 0-1.7-.98L15 3h-4l-.35 2.93c-.61.25-1.18.58-1.7.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.09.73 1.7.98L11 21h4l.35-2.93c.61-.25 1.18-.58 1.7-.98l2.49 1 2-3.46-2.11-1.65ZM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5Z",
  home: "M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3Z", search: "m9.5 3a6.5 6.5 0 0 1 5.17 10.44L21 19.77 19.77 21l-6.33-6.33A6.5 6.5 0 1 1 9.5 3Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z", add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z", close: "M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.7 4.3 4.29 10.59 10.6 16.89 4.3Z", check: "m9 16.17-3.88-3.88-1.41 1.42L9 19 21 7l-1.41-1.41z", menu: "M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z", play: "M8 5v14l11-7L8 5Z", pause: "M6 19h4V5H6v14Zm8-14v14h4V5h-4Z", info: "M11 17h2v-6h-2v6Zm1-14a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm-1-9h2V8h-2v2Z", arrowUp: "m7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z", arrowDown: "m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z", chevronDown: "m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z", chevronUp: "m7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z", more: "M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0-4Z", edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z", delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 9h8v10H8V9Zm7.5-5-1-1h-5l-1 1H5v2h14V4z", download: "M19 9h-4V3H9v6H5l7 7 7-7Zm-7 4.17L9.83 11H11V5h2v6h1.17L12 13.17ZM5 19v2h14v-2H5Z", upload: "M9 16h6v-6h4l-7-7-7 7h4v6Zm3-9.17L14.17 9H13v5h-2V9H9.83L12 6.83ZM5 19v2h14v-2H5Z", link: "M3.9 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0 0 6h3v2h-3a5 5 0 0 1-5-5Zm7-1h4v2h-4v-2Zm5.2-4h-3V5h3a5 5 0 0 1 0 10h-3v-2h3a3 3 0 0 0 0-6Z",
};

Object.assign(PATHS, {
  appearance: "M12 3a9 9 0 0 0 0 18h1.2a2.8 2.8 0 0 0 2.8-2.8c0-.66-.24-1.27-.64-1.74-.33-.4-.08-1.02.44-1.02H17a4 4 0 0 0 4-4C21 6.76 17 3 12 3Zm-4 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm4 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z",
  about: "M11 17h2v-6h-2v6Zm1-14a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm-1-9h2V8h-2v2Z",
  back: "m20 11-7-7v4C7 8 3.5 10.5 2 15c2.5-2.5 5.5-3.5 11-3.5V16l7-5Z",
  forward: "m4 13 7 7v-4c6 0 9.5-2.5 11-7-2.5 2.5-5.5 3.5-11 3.5V6l-7 7Z",
  weather: "M7 18a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 11a4 4 0 0 1-1 7H7Zm0-2h12a2 2 0 1 0-.33-3.97l-1.1.18-.18-1.1A4 4 0 0 0 10 9.4l-.34 1.1-1.1-.25A3 3 0 1 0 7 16Z",
  palette: "M12 3a9 9 0 0 0 0 18h1.2a2.8 2.8 0 0 0 2.8-2.8c0-.66-.24-1.27-.64-1.74-.33-.4-.08-1.02.44-1.02H17a4 4 0 0 0 4-4C21 6.76 17 3 12 3Zm-4 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm4 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z",
  calendar: "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11ZM5 7V6h14v1H5Z",
  clock: "M11 7h2v5.59l3.7 3.7-1.42 1.42L11 13.41V7Zm1-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z",
  content: "M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z",
  data: "M12 3C7.03 3 3 4.79 3 7v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Zm0 2c3.87 0 7 .9 7 2s-3.13 2-7 2-7-.9-7-2 3.13-2 7-2Zm0 14c-3.87 0-7-.9-7-2v-2.12C6.44 15.6 9.16 16 12 16s5.56-.4 7-1.12V17c0 1.1-3.13 2-7 2Zm0-5c-3.87 0-7-.9-7-2v-2.12C6.44 10.6 9.16 11 12 11s5.56-.4 7-1.12V12c0 1.1-3.13 2-7 2Z",
  externalLink: "M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3ZM5 5h5v2H7v10h10v-3h2v5H5V5Z",
  music: "M12 3v11.28A3.5 3.5 0 1 0 14 17V7h6V3h-8Z",
  audio: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm1 7V3.5L18.5 9H15Zm-3 8.5a2.5 2.5 0 1 1-1-2v-4h5v2h-3v2a2.5 2.5 0 0 1-1 2Z",
  quote: "M6 17h4l2-4V7H6v6h3l-1 4Zm8 0h4l2-4V7h-6v6h3l-1 4Z",
  reset: "M12 5V2L8 6l4 4V7a5 5 0 1 1-4.9 6H5.02A7 7 0 1 0 12 5Z", drag: "M8 5h2v2H8V5Zm6 0h2v2h-2V5ZM8 11h2v2H8v-2Zm6 0h2v2h-2v-2ZM8 17h2v2H8v-2Zm6 0h2v2h-2v-2Z",
  light: "M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 14a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm9-6a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm7-4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  dark: "M20.5 15.5A8 8 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z",
  system: "M4 5h16v12H4V5Zm-2 14h20v2H2v-2Z",
  eye: "M12 5c-5 0-9 7-9 7s4 7 9 7 9-7 9-7-4-7-9-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z",
  alert: "M12 3 1 21h22L12 3Zm-1 8h2v4h-2v-4Zm0 5h2v2h-2v-2Z",
  refresh: "M12 5V2L8 6l4 4V7a5 5 0 1 1-4.9 6H5.02A7 7 0 1 0 12 5Z", image: "M21 19V5H3v14h18ZM5 7h14v10H5V7Zm2 8 2.5-3 2 2.5 1.5-2 3 2.5H7Z", video: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm1 7V3.5L18.5 9H15ZM10 11v6l5-3-5-3Z",
});

const CUSTOM_PATHS: Record<string, string> = {
  public: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 9h-3.03a15.7 15.7 0 0 0-1.2-5.02A8.03 8.03 0 0 1 18.92 11ZM12 4c.83 1.2 1.5 3.2 1.78 7h-3.56C10.5 7.2 11.17 5.2 12 4ZM9.31 5.98A15.7 15.7 0 0 0 8.11 11H5.08a8.03 8.03 0 0 1 4.23-5.02ZM5.08 13h3.03c.2 2.03.63 3.75 1.2 5.02A8.03 8.03 0 0 1 5.08 13ZM12 20c-.83-1.2-1.5-3.2-1.78-7h3.56c-.28 3.8-.95 5.8-1.78 7Zm2.69-1.98c.57-1.27 1-2.99 1.2-5.02h3.03a8.03 8.03 0 0 1-4.23 5.02Z",
};

export interface AppIconProps {
  name: SemanticIconName | string;
  provider?: IconProvider;
  size?: number;
  className?: string;
}

export function AppIcon({ name, provider, size = 18, className }: AppIconProps) {
  const { config } = useApp();
  const resolved = provider ?? resolveIconProvider(config.appearance.iconStyle, config.appearance.surfaceMode);
  if (resolved === "material" && (PATHS[name as SemanticIconName] || CUSTOM_PATHS[name])) return <svg className={cn("app-icon", className)} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={PATHS[name as SemanticIconName] ?? CUSTOM_PATHS[name]} fill="currentColor" /></svg>;
  const FeatherIcon = FEATHER[name as SemanticIconName] ?? Link2;
  return <FeatherIcon className={cn("app-icon", className)} size={size} aria-hidden="true" />;
}
