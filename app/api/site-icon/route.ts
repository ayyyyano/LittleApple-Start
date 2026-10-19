import { assertPublicHttpUrl, fetchPublicResponse } from "@/lib/server/site-metadata";
import { discoverSiteIcons, iconContentType, isServicePlaceholder, MAX_ICON_CANDIDATES } from "@/lib/server/site-icon-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ICON_BYTES = 1024 * 1024;
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

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

function emptyResponse(cacheControl: string): Response {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": cacheControl },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const target = params.get("url")?.trim();
  const cacheControl = params.get("refresh") === "1" ? "no-store" : CACHE_CONTROL;
  if (!target) return Response.json({ error: "Missing url" }, { status: 400 });
  const start = Number(params.get("start") ?? 0);
  if (!Number.isInteger(start) || start < 0 || start >= MAX_ICON_CANDIDATES) return emptyResponse("no-store");

  try {
    const pageUrl = await assertPublicHttpUrl(target);
    pageUrl.search = "";
    pageUrl.hash = "";
    const signal = AbortSignal.timeout(15_000);
    const candidates = await discoverSiteIcons(pageUrl, params.get("refresh") === "1" && start === 0, signal);
    for (let index = start; index < candidates.length && !signal.aborted; index += 1) {
      try {
        const candidate = candidates[index];
        const { response } = await fetchPublicResponse(new URL(candidate.url), "image/png,image/svg+xml,image/x-icon,image/webp,image/*;q=0.8", AbortSignal.any([signal, AbortSignal.timeout(3_000)]));
        if (!response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
          await response.body?.cancel();
          continue;
        }
        const icon = await readBytes(response, MAX_ICON_BYTES);
        const contentType = iconContentType(icon);
        if (!contentType || (candidate.source === "service" && isServicePlaceholder(icon))) continue;
        const iconBody = icon.buffer.slice(icon.byteOffset, icon.byteOffset + icon.byteLength) as ArrayBuffer;
        return new Response(iconBody, {
          headers: {
            "Cache-Control": cacheControl,
            "Content-Type": contentType,
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            "X-Content-Type-Options": "nosniff",
            "X-Site-Icon-Source": candidate.source,
            "X-Site-Icon-Next": String(index + 1),
          },
        });
      } catch {
        // Try the next bounded candidate after a failed request or invalid image.
      }
    }
    return emptyResponse("public, max-age=60");
  } catch {
    return emptyResponse("no-store");
  }
}
