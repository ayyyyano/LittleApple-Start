import { isIP } from "node:net";

const ICON_REL_VALUES = new Set([
  "icon",
  "apple-touch-icon",
  "apple-touch-icon-precomposed",
  "mask-icon",
]);

type IconCandidate = {
  url: string;
  score: number;
  order: number;
};

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of tag.matchAll(attributePattern)) {
    const name = match[1]?.toLowerCase();
    if (!name || name === "link") continue;
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attributes;
}

function isIconRel(value: string): boolean {
  const tokens = value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.includes("icon")) return true;
  return tokens.some((token) => ICON_REL_VALUES.has(token));
}

function iconScore(attributes: Map<string, string>, order: number): number {
  const relTokens = (attributes.get("rel") ?? "").toLowerCase().trim().split(/\s+/);
  const href = attributes.get("href")?.toLowerCase() ?? "";
  const type = attributes.get("type")?.toLowerCase() ?? "";
  const sizes = attributes.get("sizes")?.toLowerCase() ?? "";
  let score = order;

  if (relTokens.includes("icon")) score += 1_000_000;
  else if (relTokens.some((token) => token.startsWith("apple-touch-icon"))) score += 500_000;
  else if (relTokens.includes("mask-icon")) score += 100_000;
  if (type === "image/svg+xml" || href.endsWith(".svg")) score += 100_000;
  if (sizes === "any") score += 90_000;

  for (const size of sizes.split(/\s+/)) {
    const match = /^(\d+)x(\d+)$/.exec(size);
    if (!match) continue;
    score += Math.min(Number(match[1]), Number(match[2]));
  }

  return score;
}

function documentHeadMarkup(html: string): string {
  const headStart = /<head\b[^>]*>/i.exec(html);
  if (headStart?.index !== undefined) {
    const contentStart = headStart.index + headStart[0].length;
    const headEnd = html.slice(contentStart).search(/<\/head\s*>/i);
    return headEnd >= 0
      ? html.slice(contentStart, contentStart + headEnd)
      : html.slice(contentStart);
  }

  const bodyStart = html.search(/<body\b/i);
  return bodyStart >= 0 ? html.slice(0, bodyStart) : html;
}

/**
 * Finds only icons explicitly declared by the page. This intentionally does not
 * synthesize /favicon.ico or probe any conventional website directories.
 */
export function findDeclaredSiteIcon(html: string, pageUrl: string): string | null {
  let documentUrl: URL;
  try {
    documentUrl = new URL(pageUrl);
  } catch {
    return null;
  }

  const candidates: IconCandidate[] = [];
  const headMarkup = documentHeadMarkup(html);
  let baseUrl = documentUrl;
  const baseTag = headMarkup.match(/<base\b[^>]*>/i)?.[0];
  if (baseTag) {
    const declaredBase = parseAttributes(baseTag).get("href")?.trim();
    if (declaredBase) {
      try {
        const resolvedBase = new URL(declaredBase, documentUrl);
        if (isHttpUrl(resolvedBase)) baseUrl = resolvedBase;
      } catch {
        // A malformed base URL does not invalidate otherwise valid icon declarations.
      }
    }
  }

  const linkTags = headMarkup.match(/<link\b[^>]*>/gi) ?? [];

  linkTags.forEach((tag, order) => {
    const attributes = parseAttributes(tag);
    if (!isIconRel(attributes.get("rel") ?? "")) return;

    const href = attributes.get("href")?.trim();
    if (!href) return;

    try {
      const url = new URL(href, baseUrl);
      if (!isHttpUrl(url) || url.username || url.password) return;
      candidates.push({ url: url.href, score: iconScore(attributes, order), order });
    } catch {
      // Ignore malformed declarations and keep looking for another explicit icon.
    }
  });

  candidates.sort((left, right) => right.score - left.score || right.order - left.order);
  return candidates[0]?.url ?? null;
}

export function isHttpUrl(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) return true;

  const firstGroup = Number.parseInt(normalized.split(":")[0] || "0", 16);
  return (
    (firstGroup & 0xfe00) === 0xfc00 ||
    (firstGroup & 0xffc0) === 0xfe80 ||
    (firstGroup & 0xff00) === 0xff00 ||
    normalized === "2001:db8::" ||
    normalized.startsWith("2001:db8:")
  );
}

export function isPrivateOrReservedIp(address: string): boolean {
  const normalized = address.replace(/^\[|\]$/g, "");
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version === 6) return isPrivateIpv6(normalized);
  return true;
}
