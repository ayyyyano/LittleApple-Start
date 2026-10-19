import { createHash } from "node:crypto";
import { findDeclaredSiteIcons } from "@/lib/site-icon";
import { fetchHtml } from "@/lib/server/site-metadata";

export const MAX_ICON_CANDIDATES = 6;
type Candidate = { url: string; source: "declared" | "conventional" | "service" };
const discoveries = new Map<string, { expires: number; pending: Promise<Candidate[]> }>();

export function discoverSiteIcons(pageUrl: URL, refresh: boolean, signal: AbortSignal): Promise<Candidate[]> {
  const key = pageUrl.origin;
  const cached = discoveries.get(key);
  if (!refresh && cached && cached.expires > Date.now()) return cached.pending;
  const pending = (async () => {
    let declared: string[] = [];
    let finalUrl = pageUrl.href;
    try {
      const page = await fetchHtml(pageUrl, { allowPartialHead: true, signal: AbortSignal.any([signal, AbortSignal.timeout(3_000)]) });
      finalUrl = page.finalUrl;
      declared = findDeclaredSiteIcons(page.html, finalUrl).slice(0, 4);
    } catch {
      // Sites that block document fetching can still expose a usable favicon.
    }
    const candidates: Candidate[] = declared.map((url) => ({ url, source: "declared" }));
    candidates.push({ url: new URL("/favicon.ico", finalUrl).href, source: "conventional" });
    const service = new URL("https://www.google.com/s2/favicons");
    service.searchParams.set("domain", pageUrl.hostname);
    service.searchParams.set("sz", "64");
    candidates.push({ url: service.href, source: "service" });
    return candidates.filter(({ url }, index, all) => all.findIndex((item) => item.url === url) === index);
  })();
  discoveries.delete(key);
  discoveries.set(key, { expires: Date.now() + 10 * 60_000, pending });
  if (discoveries.size > 128) discoveries.delete(discoveries.keys().next().value!);
  return pending;
}

/** Verify the file format before the browser performs its final image decode. */
export function iconContentType(bytes: Uint8Array): string | null {
  const data = Buffer.from(bytes);
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && data.toString("ascii", 12, 16) === "IHDR" && data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0) return "image/png";
  if (data.length >= 22 && data.readUInt32LE(0) === 0x10000 && data.readUInt16LE(4) > 0) {
    const count = data.readUInt16LE(4);
    if (6 + count * 16 <= data.length && data.readUInt32LE(18) >= 6 + count * 16 && data.readUInt32LE(18) + data.readUInt32LE(14) <= data.length) return "image/x-icon";
  }
  if (data.length >= 10 && /^GIF8[79]a/.test(data.toString("ascii", 0, 6)) && data.readUInt16LE(6) && data.readUInt16LE(8)) return "image/gif";
  if (data.length >= 4 && data[0] === 255 && data[1] === 216 && data[2] === 255) return "image/jpeg";
  if (data.length >= 20 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  const svg = data.toString("utf8").replace(/^\uFEFF/, "").replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi, "").trim();
  if (/^<svg\b/i.test(svg) && /<\/svg\s*>\s*$/i.test(svg) && !/<(?:script|foreignObject|html)\b/i.test(svg)) return "image/svg+xml";
  return null;
}

export function isServicePlaceholder(bytes: Uint8Array): boolean {
  // S2's 64px unknown-site image, also rejected if an intermediary changes 404 to 200.
  return createHash("sha256").update(bytes).digest("hex") === "59bfe9bc385ad69f50793ce4a53397316d7a875a7148a63c16df9b674c6cda64";
}
