import { refreshSiteIconBlob } from "@/lib/site-icon-cache";
import type { QuickLink } from "@/types/config";

export async function refreshAutomaticSiteIcons(links: QuickLink[], refresh = refreshSiteIconBlob) {
  const automatic = links.filter((link) => !link.icon && !link.iconAssetId);
  let loaded = 0;
  // Limit concurrency: each icon can require both a page and an image request.
  for (const link of automatic) if (await refresh(link.url)) loaded += 1;
  return { loaded, total: automatic.length };
}
