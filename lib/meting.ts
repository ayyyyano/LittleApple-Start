import { isSafeHttpUrl } from "@/lib/validation";
import type { APlayerTrack, MetingConfig } from "@/types/config";

export class MetingResolveError extends Error {
  constructor(public readonly code: "invalid-config" | "request-failed" | "invalid-response" | "empty-result", message: string) {
    super(message);
    this.name = "MetingResolveError";
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function firstText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const parts = value.map((item) => isRecord(item) ? text(item.name ?? item.title ?? item.artist) : text(item)).filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
    const valueText = text(value);
    if (valueText) return valueText;
  }
  return "";
}

function responseItems(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of ["data", "result", "songs", "playlist", "tracks"]) {
    const nested = payload[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
    if (isRecord(nested)) return [nested];
  }
  return [payload];
}

function normalizeLyric(value: unknown): string | undefined {
  const lyric = text(value);
  if (!lyric) return undefined;
  if (isSafeHttpUrl(lyric)) return lyric;
  return lyric.includes("[") ? lyric.slice(0, 20_000) : undefined;
}

function normalizeTrack(item: UnknownRecord, index: number): APlayerTrack | undefined {
  const url = firstText(item, ["url", "audio", "audioUrl", "playUrl", "play_url", "mp3"]);
  if (!isSafeHttpUrl(url)) return undefined;
  const title = firstText(item, ["title", "name", "song"]) || `Meting track ${index + 1}`;
  const artist = firstText(item, ["artist", "artists", "singer", "author"]);
  const coverCandidate = firstText(item, ["cover", "pic", "picUrl", "picture", "artwork"]);
  const lyric = normalizeLyric(item.lrc ?? item.lyric ?? item.lyrics);
  const sourceId = firstText(item, ["id", "songId", "song_id"]);
  const stablePart = sourceId || `${index}-${url}`;
  return {
    id: `meting-${stablePart.slice(0, 120)}`,
    title: title.slice(0, 80),
    artist: artist.slice(0, 80),
    url,
    cover: isSafeHttpUrl(coverCandidate) ? coverCandidate : undefined,
    lrc: lyric,
  };
}

export function buildMetingRequestUrl(config: MetingConfig): string {
  const apiBaseUrl = config.apiBaseUrl.trim();
  const server = config.server.trim();
  const value = config.value.trim();
  if (!isSafeHttpUrl(apiBaseUrl) || !server || !value) {
    throw new MetingResolveError("invalid-config", "Meting configuration is incomplete");
  }
  const url = new URL(apiBaseUrl);
  url.searchParams.set("server", server);
  url.searchParams.set("type", config.mode);
  url.searchParams.set("id", value);
  return url.toString();
}

export async function resolveMetingTracks(config: MetingConfig, signal?: AbortSignal): Promise<APlayerTrack[]> {
  const requestUrl = buildMetingRequestUrl(config);
  let response: Response;
  try {
    response = await fetch(requestUrl, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new MetingResolveError("request-failed", "Meting request failed");
  }
  if (!response.ok) throw new MetingResolveError("request-failed", `Meting request returned ${response.status}`);
  let payload: unknown;
  try {
    payload = await response.json() as unknown;
  } catch {
    throw new MetingResolveError("invalid-response", "Meting returned invalid JSON");
  }
  const tracks = responseItems(payload).flatMap((item, index) => {
    const track = normalizeTrack(item, index);
    return track ? [track] : [];
  });
  if (tracks.length === 0) throw new MetingResolveError("empty-result", "Meting returned no playable tracks");
  return tracks;
}

