import { deleteBackgroundAsset, getBackgroundAsset, saveBackgroundAsset } from "@/services/background-storage";

export const QUICK_LINK_ICON_LIMIT = 2 * 1024 * 1024;

export function quickLinkIconAssetId(linkId: string): `quick-link-icon:${string}` {
  return `quick-link-icon:${linkId}`;
}

export async function getQuickLinkIcon(assetId: string): Promise<Blob | null> {
  if (!assetId.startsWith("quick-link-icon:")) return null;
  return (await getBackgroundAsset(assetId as `quick-link-icon:${string}`))?.blob ?? null;
}

export async function saveQuickLinkIcon(assetId: `quick-link-icon:${string}`, file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new Error("QUICK_LINK_ICON_TYPE");
  if (file.size > QUICK_LINK_ICON_LIMIT) throw new Error("QUICK_LINK_ICON_SIZE");
  await saveBackgroundAsset({ id: assetId, blob: file, mimeType: file.type, name: file.name, updatedAt: new Date().toISOString() });
}

export function deleteQuickLinkIcon(assetId: string | undefined): Promise<void> {
  if (!assetId?.startsWith("quick-link-icon:")) return Promise.resolve();
  return deleteBackgroundAsset(assetId as `quick-link-icon:${string}`);
}
