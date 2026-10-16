import { lookup } from "node:dns/promises";

import { findDeclaredSiteIcon, isHttpUrl, isPrivateOrReservedIp } from "@/lib/site-icon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_ICON_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

async function assertPublicHttpUrl(value: string | URL): Promise<URL> {
  const url = value instanceof URL ? value : new URL(value);
  if (!isHttpUrl(url) || url.username || url.password) throw new Error("Unsupported URL");

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Private host");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new Error("Private address");
  }

  return url;
}

async function fetchPublicResponse(startUrl: URL, accept: string): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    currentUrl = await assertPublicHttpUrl(currentUrl);
    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: accept,
        "User-Agent": "LittleApple-SiteIcon/1.0",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("Redirect limit");
      await response.body?.cancel();
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) throw new Error("Request failed");
    return { response, finalUrl: currentUrl.href };
  }

  throw new Error("Redirect limit");
}

async function fetchHtml(startUrl: URL): Promise<{ html: string; finalUrl: string }> {
  const { response, finalUrl } = await fetchPublicResponse(
    startUrl,
    "text/html,application/xhtml+xml",
  );
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("Page is not HTML");
  }

  if (!response.body) return { html: "", finalUrl };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Page is too large");
    }
    html += decoder.decode(value, { stream: true });
    if (/<\/head\s*>/i.test(html)) {
      await reader.cancel();
      break;
    }
  }

  html += decoder.decode();
  return { html, finalUrl };
}

async function readBytes(response: Response, maximumBytes: number): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error("Response is too large");
  }

  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > maximumBytes) {
      await reader.cancel();
      throw new Error("Response is too large");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function emptyResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("url")?.trim();
  if (!target) return Response.json({ error: "Missing url" }, { status: 400 });

  try {
    const pageUrl = await assertPublicHttpUrl(target);
    const { html, finalUrl } = await fetchHtml(pageUrl);
    const iconUrl = findDeclaredSiteIcon(html, finalUrl);
    if (!iconUrl) return emptyResponse();

    const { response } = await fetchPublicResponse(
      await assertPublicHttpUrl(iconUrl),
      "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.1",
    );
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) return emptyResponse();

    const icon = await readBytes(response, MAX_ICON_BYTES);
    if (icon.byteLength === 0) return emptyResponse();

    const iconBody = icon.buffer.slice(icon.byteOffset, icon.byteOffset + icon.byteLength) as ArrayBuffer;
    return new Response(iconBody, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return emptyResponse();
  }
}
