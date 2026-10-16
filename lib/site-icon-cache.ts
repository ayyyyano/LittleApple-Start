"use client";

const SITE_ICON_CACHE = "littleapple-site-icons-v1";
const MAX_CACHED_SITE_ICONS = 128;
const siteIconRequests = new Map<string, Promise<Blob | null>>();

function siteIconEndpoint(pageUrl: string): string {
  return `/api/site-icon?url=${encodeURIComponent(pageUrl)}`;
}

async function validImageBlob(response: Response): Promise<Blob | null> {
  if (response.status === 204 || !response.ok) return null;
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size === 0) return null;

  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Invalid site icon"));
      image.src = objectUrl;
    });
    return blob;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function openSiteIconCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(SITE_ICON_CACHE);
  } catch {
    return null;
  }
}

async function trimSiteIconCache(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHED_SITE_ICONS;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function resolveSiteIconBlob(pageUrl: string): Promise<Blob | null> {
  const endpoint = siteIconEndpoint(pageUrl);
  let cache = await openSiteIconCache();
  let cachedResponse: Response | undefined;

  try {
    cachedResponse = await cache?.match(endpoint);
  } catch {
    cache = null;
  }

  if (cachedResponse) {
    const cachedBlob = await validImageBlob(cachedResponse);
    if (cachedBlob) return cachedBlob;
    try {
      await cache?.delete(endpoint);
    } catch {
      cache = null;
    }
  }

  const response = await fetch(endpoint);
  const responseForCache = response.clone();
  const blob = await validImageBlob(response);
  if (!blob) return null;

  if (cache) {
    try {
      await cache.put(endpoint, responseForCache);
      await trimSiteIconCache(cache);
    } catch {
      // A usable network icon should still render if persistent caching fails.
    }
  }

  return blob;
}

export function loadSiteIconBlob(pageUrl: string): Promise<Blob | null> {
  const pending = siteIconRequests.get(pageUrl);
  if (pending) return pending;

  const request = resolveSiteIconBlob(pageUrl).catch(() => null);
  siteIconRequests.set(pageUrl, request);
  void request.finally(() => {
    if (siteIconRequests.get(pageUrl) === request) siteIconRequests.delete(pageUrl);
  });
  return request;
}

export async function deleteCachedSiteIcon(pageUrl: string): Promise<void> {
  const cache = await openSiteIconCache();
  try {
    await cache?.delete(siteIconEndpoint(pageUrl));
  } catch {
    // Cache cleanup is best-effort; the initial fallback remains available.
  }
  siteIconRequests.delete(pageUrl);
}
