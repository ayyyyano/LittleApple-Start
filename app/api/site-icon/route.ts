import { findDeclaredSiteIcon } from "@/lib/site-icon";
import { assertPublicHttpUrl, fetchHtml, fetchPublicResponse } from "@/lib/server/site-metadata";

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

  try {
    const pageUrl = await assertPublicHttpUrl(target);
    const { html, finalUrl } = await fetchHtml(pageUrl);
    const iconUrl = findDeclaredSiteIcon(html, finalUrl);
    if (!iconUrl) return emptyResponse(cacheControl);

    const { response } = await fetchPublicResponse(
      await assertPublicHttpUrl(iconUrl),
      "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.1",
    );
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) return emptyResponse(cacheControl);

    const icon = await readBytes(response, MAX_ICON_BYTES);
    if (icon.byteLength === 0) return emptyResponse(cacheControl);

    const iconBody = icon.buffer.slice(icon.byteOffset, icon.byteOffset + icon.byteLength) as ArrayBuffer;
    return new Response(iconBody, {
      headers: {
        "Cache-Control": cacheControl,
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return emptyResponse(cacheControl);
  }
}
