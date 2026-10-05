import { isSafeHttpUrl } from "@/lib/validation";
import type { AppConfig } from "@/types/config";

export interface DeploymentFooterDefaults {
  icpEnabled?: boolean;
  icpText?: string;
  icpUrl?: string;
  policeEnabled?: boolean;
  policeText?: string;
  policeUrl?: string;
  copyrightEnabled?: boolean;
  copyrightText?: string;
}

export interface DeploymentDefaults {
  siteName?: string;
  backgroundUrl?: string;
  faviconUrl?: string;
  footer?: DeploymentFooterDefaults;
}

type Environment = Record<string, string | undefined>;
type UnknownRecord = Record<string, unknown>;

const MAX_SITE_NAME_LENGTH = 60;
const MAX_TEXT_LENGTH = 160;
const MAX_URL_LENGTH = 500;

function nonEmptyText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export function isSafeDeploymentUrl(value: string): boolean {
  const trimmed = value.trim();
  if (isSafeHttpUrl(trimmed)) return true;
  return trimmed.startsWith("/") && !trimmed.startsWith("//") && !/[\u0000-\u001f\u007f]/.test(trimmed);
}

function publicUrl(value: unknown): string | undefined {
  const text = nonEmptyText(value, MAX_URL_LENGTH);
  return text && isSafeDeploymentUrl(text) ? text : undefined;
}

function parseBoolean(value: unknown, key: string, warn?: (message: string) => void): boolean | undefined {
  if (typeof value === "boolean") return value;
  const text = nonEmptyText(value, 8)?.toLowerCase();
  if (!text) return undefined;
  if (text === "true" || text === "1") return true;
  if (text === "false" || text === "0") return false;
  warn?.(`Ignoring invalid deployment default ${key}`);
  return undefined;
}

function parseFromRecord(record: UnknownRecord, warn?: (message: string) => void): DeploymentDefaults {
  const footerRecord = record.footer;
  const footer = footerRecord && typeof footerRecord === "object" && !Array.isArray(footerRecord)
    ? footerRecord as UnknownRecord
    : undefined;
  const result: DeploymentDefaults = {
    siteName: nonEmptyText(record.siteName, MAX_SITE_NAME_LENGTH),
    backgroundUrl: publicUrl(record.backgroundUrl),
    faviconUrl: publicUrl(record.faviconUrl),
  };
  const footerDefaults: DeploymentFooterDefaults = {
    icpEnabled: parseBoolean(footer?.icpEnabled, "LITTLEAPPLE_DEFAULT_ICP_ENABLED", warn),
    icpText: nonEmptyText(footer?.icpText, MAX_TEXT_LENGTH),
    icpUrl: publicUrl(footer?.icpUrl),
    policeEnabled: parseBoolean(footer?.policeEnabled, "LITTLEAPPLE_DEFAULT_POLICE_ENABLED", warn),
    policeText: nonEmptyText(footer?.policeText, MAX_TEXT_LENGTH),
    policeUrl: publicUrl(footer?.policeUrl),
    copyrightEnabled: parseBoolean(footer?.copyrightEnabled, "LITTLEAPPLE_DEFAULT_COPYRIGHT_ENABLED", warn),
    copyrightText: nonEmptyText(footer?.copyrightText, MAX_TEXT_LENGTH),
  };
  if (Object.values(footerDefaults).some((value) => value !== undefined)) result.footer = footerDefaults;
  return result;
}

export function parseDeploymentDefaults(
  env: Environment,
  warn?: (message: string) => void,
): DeploymentDefaults {
  return parseFromRecord({
    siteName: env.LITTLEAPPLE_DEFAULT_SITE_NAME,
    backgroundUrl: env.LITTLEAPPLE_DEFAULT_BACKGROUND_URL,
    faviconUrl: env.LITTLEAPPLE_DEFAULT_FAVICON_URL,
    footer: {
      icpEnabled: env.LITTLEAPPLE_DEFAULT_ICP_ENABLED,
      icpText: env.LITTLEAPPLE_DEFAULT_ICP_TEXT,
      icpUrl: env.LITTLEAPPLE_DEFAULT_ICP_URL,
      policeEnabled: env.LITTLEAPPLE_DEFAULT_POLICE_ENABLED,
      policeText: env.LITTLEAPPLE_DEFAULT_POLICE_TEXT,
      policeUrl: env.LITTLEAPPLE_DEFAULT_POLICE_URL,
      copyrightEnabled: env.LITTLEAPPLE_DEFAULT_COPYRIGHT_ENABLED,
      copyrightText: env.LITTLEAPPLE_DEFAULT_COPYRIGHT_TEXT,
    },
  }, warn);
}

export function normalizeDeploymentDefaults(value: unknown): DeploymentDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return parseFromRecord(value as UnknownRecord);
}

export function applyDeploymentDefaults(base: AppConfig, defaults: DeploymentDefaults): AppConfig {
  const next = structuredClone(base);
  if (defaults.siteName) next.siteIdentity.name = defaults.siteName;
  if (defaults.backgroundUrl) {
    next.appearance.backgroundType = "image";
    next.appearance.backgroundUrl = defaults.backgroundUrl;
  }

  const footer = defaults.footer;
  if (footer) {
    if (footer.icpEnabled !== undefined) next.content.footer.showIcp = footer.icpEnabled;
    if (footer.icpText) next.content.footer.icpText = footer.icpText;
    if (footer.icpUrl) next.content.footer.icpUrl = footer.icpUrl;
    if (footer.policeEnabled !== undefined) next.content.footer.showPolice = footer.policeEnabled;
    if (footer.policeText) next.content.footer.policeText = footer.policeText;
    if (footer.policeUrl) next.content.footer.policeUrl = footer.policeUrl;
    if (footer.copyrightEnabled !== undefined) next.content.footer.showCopyright = footer.copyrightEnabled;
    if (footer.copyrightText) next.content.footer.copyrightText = footer.copyrightText;
  }
  return next;
}

export function hasDeploymentDefaults(defaults: DeploymentDefaults): boolean {
  return Boolean(defaults.siteName || defaults.backgroundUrl || defaults.faviconUrl || defaults.footer);
}
