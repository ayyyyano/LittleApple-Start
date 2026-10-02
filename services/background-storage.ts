import type { SerializedBackgroundAsset, StoredBackgroundAsset } from "@/types/config";

const DB_NAME = "LittleAppleStart";
const DB_VERSION = 1;
const STORE_NAME = "assets";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXEDDB_OPEN_FAILED"));
  });
}

export async function getBackgroundAsset(id: StoredBackgroundAsset["id"]): Promise<StoredBackgroundAsset | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as StoredBackgroundAsset | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("INDEXEDDB_READ_FAILED"));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveBackgroundAsset(asset: StoredBackgroundAsset): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(asset);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("INDEXEDDB_WRITE_FAILED"));
  });
}

export async function deleteBackgroundAsset(id: StoredBackgroundAsset["id"]): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("INDEXEDDB_DELETE_FAILED"));
  });
}

export async function clearBackgroundAssets(): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("INDEXEDDB_CLEAR_FAILED"));
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("INVALID_DATA_URL");
  const mimeType = match[1] || "application/octet-stream";
  const data = match[3] || "";
  if (match[2]) {
    const binary = atob(data);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: mimeType });
  }
  return new Blob([decodeURIComponent(data)], { type: mimeType });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

export async function serializeBackgroundAsset(
  id: StoredBackgroundAsset["id"],
): Promise<SerializedBackgroundAsset | undefined> {
  const asset = await getBackgroundAsset(id);
  if (!asset) return undefined;
  return { mimeType: asset.mimeType, name: asset.name, dataUrl: await blobToDataUrl(asset.blob) };
}

export async function restoreSerializedAsset(
  id: StoredBackgroundAsset["id"],
  asset: SerializedBackgroundAsset,
): Promise<void> {
  const blob = dataUrlToBlob(asset.dataUrl);
  await saveBackgroundAsset({ id, blob, mimeType: asset.mimeType || blob.type, name: asset.name, updatedAt: new Date().toISOString() });
}
