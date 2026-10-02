import { cloneDefaultConfig } from "@/lib/default-config";
import { migrateLegacyConfig, migrateV2Config } from "@/lib/config-migrations";
import { parseCurrentConfig } from "@/lib/config-parser";
import { dataUrlToBlob, saveBackgroundAsset } from "@/services/background-storage";
import type { AppConfig } from "@/types/config";

const CONFIG_KEY = "littleapple.config.v4";
const V3_CONFIG_KEY = "littleapple.config.v3";
const V2_CONFIG_KEY = "littleapple.config.v2";
const LEGACY_DB_NAME = "StartPageDB";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXEDDB_READ_FAILED"));
  });
}

async function legacyDatabaseExists(): Promise<boolean> {
  if (!("databases" in indexedDB)) return true;
  const databases = await indexedDB.databases();
  return databases.some((database) => database.name === LEGACY_DB_NAME);
}

async function readLegacyData(): Promise<{ config: unknown; background: unknown } | null> {
  if (!(await legacyDatabaseExists())) return null;
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("LEGACY_DB_OPEN_FAILED"));
  });
  try {
    if (!database.objectStoreNames.contains("config")) return null;
    const storeNames = database.objectStoreNames.contains("background") ? ["config", "background"] : ["config"];
    const transaction = database.transaction(storeNames, "readonly");
    const config = await requestValue(transaction.objectStore("config").get("config"));
    const background = storeNames.includes("background")
      ? await requestValue(transaction.objectStore("background").get(1))
      : undefined;
    return { config, background };
  } finally {
    database.close();
  }
}

async function migrateLegacyBackground(value: unknown, config: AppConfig): Promise<void> {
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.data !== "string") return;
  if (!value.data.startsWith("data:")) return;
  const blob = dataUrlToBlob(value.data);
  const id = value.type.startsWith("audio/") ? "audio" : "visual";
  await saveBackgroundAsset({
    id,
    blob,
    mimeType: value.type,
    name: `legacy-background.${value.type.split("/")[1] || "bin"}`,
    updatedAt: new Date().toISOString(),
  });
  if (id === "visual") config.appearance.backgroundType = value.type.startsWith("video/") ? "video" : "image";
}

export async function loadStoredConfig(): Promise<{ config: AppConfig; migratedLegacy: boolean; recovered: boolean }> {
  const serialized = localStorage.getItem(CONFIG_KEY);
  if (serialized) {
    try {
      return { config: parseCurrentConfig(JSON.parse(serialized) as unknown), migratedLegacy: false, recovered: false };
    } catch {
      localStorage.removeItem(CONFIG_KEY);
      const fallback = cloneDefaultConfig();
      saveStoredConfig(fallback);
      return { config: fallback, migratedLegacy: false, recovered: true };
    }
  }

  const serializedV3 = localStorage.getItem(V3_CONFIG_KEY);
  if (serializedV3) {
    try {
      const config = parseCurrentConfig(JSON.parse(serializedV3) as unknown);
      saveStoredConfig(config);
      localStorage.removeItem(V3_CONFIG_KEY);
      return { config, migratedLegacy: true, recovered: false };
    } catch {
      localStorage.removeItem(V3_CONFIG_KEY);
    }
  }

  const serializedV2 = localStorage.getItem(V2_CONFIG_KEY);
  if (serializedV2) {
    try {
      const config = migrateV2Config(JSON.parse(serializedV2) as unknown);
      saveStoredConfig(config);
      localStorage.removeItem(V2_CONFIG_KEY);
      return { config, migratedLegacy: true, recovered: false };
    } catch {
      localStorage.removeItem(V2_CONFIG_KEY);
    }
  }

  try {
    const legacy = await readLegacyData();
    if (legacy?.config) {
      const config = migrateLegacyConfig(legacy.config);
      await migrateLegacyBackground(legacy.background, config);
      saveStoredConfig(config);
      return { config, migratedLegacy: true, recovered: false };
    }
  } catch {
    // A blocked legacy database must not prevent the start page from loading.
  }
  const config = cloneDefaultConfig();
  saveStoredConfig(config);
  return { config, migratedLegacy: false, recovered: false };
}

export function saveStoredConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function removeStoredConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(V3_CONFIG_KEY);
  localStorage.removeItem(V2_CONFIG_KEY);
}

export async function clearLegacyStorage(): Promise<void> {
  if (!(await legacyDatabaseExists())) return;
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("LEGACY_DB_OPEN_FAILED"));
  });
  const stores = ["config", "background"].filter((name) => database.objectStoreNames.contains(name));
  if (stores.length === 0) {
    database.close();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(stores, "readwrite");
    stores.forEach((name) => transaction.objectStore(name).clear());
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("LEGACY_DB_CLEAR_FAILED"));
  });
  database.close();
}
