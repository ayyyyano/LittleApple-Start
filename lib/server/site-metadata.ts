import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isHttpUrl, isPrivateOrReservedIp } from "@/lib/site-icon";
import { requestPublicUrl } from "@/lib/server/public-http";

const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

async function resolvePublicUrl(value: string | URL, signal?: AbortSignal) {
  const url = value instanceof URL ? value : new URL(value);
  if (!isHttpUrl(url) || url.username || url.password) throw new Error("Unsupported URL");

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Private host");
  }

  const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
    const abort = () => reject(signal?.reason ?? new Error("Request timed out"));
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    lookup(hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => signal?.removeEventListener("abort", abort));
  });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new Error("Private address");
  }

  return { url, addresses };
}

export async function assertPublicHttpUrl(value: string | URL): Promise<URL> {
  return (await resolvePublicUrl(value, AbortSignal.timeout(REQUEST_TIMEOUT_MS))).url;
}

export async function fetchPublicResponse(startUrl: URL, accept: string, signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const { url, addresses } = await resolvePublicUrl(currentUrl, signal);
    currentUrl = url;
    const response = await requestPublicUrl(currentUrl, addresses, accept, signal);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("Redirect limit");
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Request failed");
    }
    return { response, finalUrl: currentUrl.href };
  }

  throw new Error("Redirect limit");
}

export async function fetchHtml(startUrl: URL, options: { allowPartialHead?: boolean; signal?: AbortSignal } = {}): Promise<{ html: string; finalUrl: string }> {
  const { response, finalUrl } = await fetchPublicResponse(
    startUrl,
    "text/html,application/xhtml+xml",
    options.signal,
  );
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    await response.body?.cancel();
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
      if (options.allowPartialHead) {
        const remaining = MAX_HTML_BYTES - (byteCount - value.byteLength);
        html += decoder.decode(value.subarray(0, remaining), { stream: true });
        break;
      }
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
