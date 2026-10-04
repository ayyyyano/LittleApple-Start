import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMetingRequestUrl, resolveMetingTracks } from "@/lib/meting";
import type { MetingConfig } from "@/types/config";

const baseConfig: MetingConfig = {
  enabled: true,
  apiBaseUrl: "https://music.example.test/api.php",
  server: "netease",
  mode: "song",
  value: "123",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Meting resolver", () => {
  it.each(["song", "playlist", "album", "search", "artist"] as const)("maps %s to the Meting request type", (mode) => {
    const url = new URL(buildMetingRequestUrl({ ...baseConfig, mode }));
    expect(url.searchParams.get("server")).toBe("netease");
    expect(url.searchParams.get("type")).toBe(mode);
    expect(url.searchParams.get("id")).toBe("123");
  });

  it("normalizes valid tracks and drops invalid entries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: 1, name: "Song", artist: "Artist", url: "https://cdn.example.test/song.mp3", pic: "https://cdn.example.test/cover.jpg", lrc: "https://cdn.example.test/song.lrc" },
      { name: "Missing URL" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const tracks = await resolveMetingTracks(baseConfig);
    expect(tracks).toEqual([{
      id: "meting-1",
      title: "Song",
      artist: "Artist",
      url: "https://cdn.example.test/song.mp3",
      cover: "https://cdn.example.test/cover.jpg",
      lrc: "https://cdn.example.test/song.lrc",
    }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty playable result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ title: "No URL" }]), { status: 200 })));
    await expect(resolveMetingTracks(baseConfig)).rejects.toMatchObject({ code: "empty-result" });
  });

  it("does not hide request cancellation as a resolver failure", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })));
    await expect(resolveMetingTracks(baseConfig, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});

