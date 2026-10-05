import { cloneDefaultConfig } from "@/lib/default-config";
import { applyDeploymentDefaults, type DeploymentDefaults } from "@/lib/deployment-defaults";
import { clearLegacyStorage, removeStoredConfig, saveStoredConfig } from "@/services/config-storage";
import {
  clearBackgroundAssets,
  getBackgroundAsset,
  restoreSerializedAsset,
  serializeBackgroundAsset,
} from "@/services/background-storage";
import type { AppConfig, ConfigExportV4 } from "@/types/config";
import { clearQuoteCache } from "@/services/quote-cache";
import { clearWeatherCache } from "@/services/weather-cache";

const BACKGROUND_BACKUP_LIMIT = 25 * 1024 * 1024;

export async function createConfigExport(config: AppConfig): Promise<{ payload: ConfigExportV4; omittedLargeAsset: boolean }> {
  const [visual, audio, avatar] = await Promise.all([getBackgroundAsset("visual"), getBackgroundAsset("audio"), getBackgroundAsset("avatar")]);
  let omittedLargeAsset = false;

  const serializedVisual = visual && visual.blob.size <= BACKGROUND_BACKUP_LIMIT
    ? await serializeBackgroundAsset("visual")
    : undefined;
  const serializedAudio = audio && audio.blob.size <= BACKGROUND_BACKUP_LIMIT
    ? await serializeBackgroundAsset("audio")
    : undefined;
  const serializedAvatar = avatar && avatar.blob.size <= BACKGROUND_BACKUP_LIMIT
    ? await serializeBackgroundAsset("avatar")
    : undefined;
  if ((visual && !serializedVisual) || (audio && !serializedAudio) || (avatar && !serializedAvatar)) omittedLargeAsset = true;

  return {
    payload: {
      version: 4,
      exportedAt: new Date().toISOString(),
      config,
      background: { visual: serializedVisual, audio: serializedAudio, avatar: serializedAvatar },
    },
    omittedLargeAsset,
  };
}

export function downloadConfig(payload: ConfigExportV4): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${timestamp()}.littleapple`);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function applyImportedConfiguration(payload: ConfigExportV4): Promise<void> {
  await clearBackgroundAssets();
  if (payload.background?.visual) await restoreSerializedAsset("visual", payload.background.visual);
  if (payload.background?.audio) await restoreSerializedAsset("audio", payload.background.audio);
  if (payload.background?.avatar) await restoreSerializedAsset("avatar", payload.background.avatar);
  saveStoredConfig(payload.config);
}

export async function resetAllConfiguration(deploymentDefaults: DeploymentDefaults = {}): Promise<AppConfig> {
  removeStoredConfig();
  clearQuoteCache();
  clearWeatherCache();
  await Promise.all([clearBackgroundAssets(), clearLegacyStorage()]);
  const config = applyDeploymentDefaults(cloneDefaultConfig(), deploymentDefaults);
  saveStoredConfig(config);
  return config;
}

function timestamp(): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
}
