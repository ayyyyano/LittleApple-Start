import { refreshSiteIconBlob } from "@/lib/site-icon-cache";
import type { QuickLink } from "@/types/config";

export async function refreshAutomaticSiteIcons(links: QuickLink[], refresh = refreshSiteIconBlob) {
  const automatic = links.filter((link) => !link.icon && !link.iconAssetId);
  let loaded = 0;
  const domains = new Map<string, Blob | null>();
  for (const link of automatic) {
    let key = link.url;
    try { key = new URL(link.url).origin; } catch { /* Invalid URLs resolve to initials. */ }
    if (!domains.has(key)) domains.set(key, await refresh(link.url));
    if (domains.get(key)) loaded += 1;
  }
  return { loaded, total: automatic.length };
}
