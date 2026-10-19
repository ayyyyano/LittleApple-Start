"use client";

const SITE_ICON_CACHE = "littleapple-site-icons-v1";
const MAX_CACHED_SITE_ICONS = 128;
const siteIconRequests = new Map<string, Promise<Blob | null>>();
const recentIcons = new Map<string, { expires: number; blob: Blob | null }>();
const ICON_TTL = 30 * 24 * 60 * 60_000;
const FAILURE_TTL = 5 * 60_000;
const FETCHED_AT = "X-LittleApple-Icon-Cached-At";

function siteIconEndpoint(pageUrl: string): string {
  const url = new URL(pageUrl);
  url.hash = "";
  url.search = "";
  return `/api/site-icon?url=${encodeURIComponent(url.href)}`;
}

async function validImageBlob(response: Response): Promise<Blob | null> {
  if (response.status === 204 || !response.ok) return null;
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size === 0 || blob.size > 1024 * 1024) return null;

  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => { image.src = ""; reject(new Error("Icon decode timed out")); }, 2_000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error("Invalid site icon")); };
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

async function resolveSiteIconBlob(pageUrl: string, refresh: boolean, isCurrent: () => boolean): Promise<Blob | null> {
  const endpoint = siteIconEndpoint(pageUrl);
  const key = siteIconEndpoint(`${new URL(pageUrl).origin}/`);
  let cache = await openSiteIconCache();
  let cachedResponse: Response | undefined;
  let cachedBlob: Blob | null = null;

  try {
    cachedResponse = refresh ? undefined : await cache?.match(key);
  } catch {
    cache = null;
  }

  if (cachedResponse) {
    if (cachedResponse.status === 204 && Date.now() - Number(cachedResponse.headers.get(FETCHED_AT) ?? 0) < FAILURE_TTL) return null;
    cachedBlob = await validImageBlob(cachedResponse.clone());
    if (cachedBlob && Date.now() - Number(cachedResponse.headers.get(FETCHED_AT) ?? 0) < ICON_TTL) return cachedBlob;
    try {
      if (!cachedBlob && isCurrent()) await cache?.delete(key);
    } catch {
      cache = null;
    }
  }

  const recent = recentIcons.get(key);
  if (!refresh && recent && recent.expires > Date.now()) return recent.blob ?? cachedBlob;
  const signal = AbortSignal.timeout(25_000);
  let start = 0;
  try {
    for (let attempt = 0; attempt < 3 && !signal.aborted; attempt += 1) {
      const response = await fetch(`${endpoint}${refresh ? "&refresh=1" : ""}${start ? `&start=${start}` : ""}`, { signal, cache: refresh ? "no-store" : "no-cache" });
      const next = Number(response.headers.get("X-Site-Icon-Next") ?? 0);
      const blob = await validImageBlob(response);
      if (blob) {
        if (isCurrent()) {
          recentIcons.delete(key);
          recentIcons.set(key, { expires: Date.now() + ICON_TTL, blob });
          if (cache) {
            try {
              await cache.put(key, new Response(blob, { headers: { "Content-Type": blob.type, [FETCHED_AT]: String(Date.now()) } }));
              await trimSiteIconCache(cache);
            } catch {
              // Storage quotas do not prevent using a decoded network image.
            }
          }
        }
        return blob;
      }
      if (!Number.isInteger(next) || next <= start || next >= 6) break;
      start = next;
    }
  } catch {
    // Offline and timed-out requests retain an expired but usable local image.
  }
  if (isCurrent()) {
    recentIcons.delete(key);
    recentIcons.set(key, { expires: Date.now() + FAILURE_TTL, blob: null });
    if (cache) {
      try {
        const previous = await cache.match(key);
        if (!previous || previous.status === 204) {
          await cache.put(key, new Response(null, { status: 204, headers: { [FETCHED_AT]: String(Date.now()) } }));
          await trimSiteIconCache(cache);
        }
      } catch {
        // Session backoff remains available when persistent storage is unavailable.
      }
    }
  }
  return refresh ? null : cachedBlob;
}

export function loadSiteIconBlob(pageUrl: string): Promise<Blob | null> {
  return requestSiteIcon(pageUrl, false);
}

export function refreshSiteIconBlob(pageUrl: string): Promise<Blob | null> {
  return requestSiteIcon(pageUrl, true);
}

function requestSiteIcon(pageUrl: string, refresh: boolean): Promise<Blob | null> {
  try {
    const url = new URL(pageUrl);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return Promise.resolve(null);
    url.hash = "";
    url.search = "";
    pageUrl = url.href;
  } catch { return Promise.resolve(null); }
  const key = siteIconEndpoint(`${new URL(pageUrl).origin}/`);
  const pending = siteIconRequests.get(key);
  if (pending && !refresh) return pending;

  const request: Promise<Blob | null> = resolveSiteIconBlob(pageUrl, refresh, () => siteIconRequests.get(key) === request).catch(() => null);
  siteIconRequests.set(key, request);
  void request.finally(() => {
    if (siteIconRequests.get(key) === request) siteIconRequests.delete(key);
    if (recentIcons.size > MAX_CACHED_SITE_ICONS) recentIcons.delete(recentIcons.keys().next().value!);
  });
  return request;
}

export async function deleteCachedSiteIcon(pageUrl: string): Promise<void> {
  const key = siteIconEndpoint(`${new URL(pageUrl).origin}/`);
  const cache = await openSiteIconCache();
  try {
    await cache?.delete(key);
  } catch {
    // Cache cleanup is best-effort; the initial fallback remains available.
  }
  siteIconRequests.delete(key);
  recentIcons.delete(key);
}
