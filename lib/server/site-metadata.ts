import { lookup } from "node:dns/promises";
import { isHttpUrl, isPrivateOrReservedIp } from "@/lib/site-icon";

const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

export async function assertPublicHttpUrl(value: string | URL): Promise<URL> {
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

export async function fetchPublicResponse(startUrl: URL, accept: string): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    currentUrl = await assertPublicHttpUrl(currentUrl);
    const response = await fetch(currentUrl, {
      redirect: "manual",
      cache: "no-store",
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

export async function fetchHtml(startUrl: URL): Promise<{ html: string; finalUrl: string }> {
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
