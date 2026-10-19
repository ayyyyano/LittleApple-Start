const CACHE_NAME = "littleapple-pwa-v1";
const OFFLINE_URL = "/pwa/offline.html";
const OFFLINE_ASSETS = [OFFLINE_URL, "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/icon-180.png", "/pwa/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith("littleapple-pwa-") && name !== CACHE_NAME).map((name) => caches.delete(name)),
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // API responses and build assets stay on the browser's normal network path.
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname === "/api" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(OFFLINE_URL) || new Response("Offline. Please reconnect and reload. / 当前离线，请联网后刷新。", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }));
});
