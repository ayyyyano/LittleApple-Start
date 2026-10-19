import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/site-icon/route";
import { iconContentType } from "@/lib/server/site-icon-resolver";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));
vi.mock("@/lib/server/public-http", () => ({ requestPublicUrl: (url: URL, _addresses: unknown, accept: string, signal: AbortSignal) => fetch(url, { signal, headers: { Accept: accept } }) }));
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M0 0h64v64H0z"/></svg>';
const page = (html: string) => new Response(html, { headers: { "Content-Type": "text/html" } });
const image = () => new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
const request = (url: string, extra = "") => GET(new Request(`http://localhost/api/site-icon?url=${encodeURIComponent(url)}&refresh=1${extra}`));

beforeEach(() => lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("favicon resolution", () => {
  it.each(["chatgpt.com", "gemini.google.com", "github.com", "x.com"])("resolves declared sub-path artwork for %s", async (host) => {
    const network = vi.fn().mockResolvedValueOnce(page('<head><link rel="icon" href="icons/site.svg"></head>')).mockResolvedValueOnce(image());
    vi.stubGlobal("fetch", network);
    const result = await request(`https://${host}/app/page?token=private#secret`);
    expect(result.status).toBe(200);
    expect(result.headers.get("X-Site-Icon-Source")).toBe("declared");
    expect(String(network.mock.calls[0][0])).toBe(`https://${host}/app/page`);
    expect(String(network.mock.calls[1][0])).toBe(`https://${host}/app/icons/site.svg`);
  });

  it("retains declarations before a large inline head script (Gemini-shaped page)", async () => {
    const network = vi.fn().mockResolvedValueOnce(page(`<head><link rel="icon" href="/logo.svg"><script>${"x".repeat(785_000)}</script></head>`)).mockResolvedValueOnce(image());
    vi.stubGlobal("fetch", network);
    expect((await request("https://large-head.example/")).status).toBe(200);
    expect(network).toHaveBeenCalledTimes(2);
  });

  it("tries another declaration after HTTP 200 HTML or a fake image payload", async () => {
    const network = vi.fn().mockResolvedValueOnce(page('<head><link rel="icon" href="/good.png" sizes="32x32"><link rel="icon" href="/bad.png" sizes="64x64"><link rel="icon" href="/bad.svg" type="image/svg+xml"></head>'))
      .mockResolvedValueOnce(new Response("<html>Login</html>", { headers: { "Content-Type": "text/html" } }))
      .mockResolvedValueOnce(new Response("<html>Fake image</html>", { headers: { "Content-Type": "image/png" } }))
      .mockResolvedValueOnce(image());
    vi.stubGlobal("fetch", network);
    expect((await request("https://alternatives.example/")).status).toBe(200);
    expect(String(network.mock.calls[3][0])).toBe("https://alternatives.example/good.png");
  });

  it("falls back after blocked HTML and sends only the hostname to S2", async () => {
    const network = vi.fn().mockRejectedValueOnce(new Error("403"))
      .mockResolvedValueOnce(new Response("Missing", { status: 404 })).mockResolvedValueOnce(image());
    vi.stubGlobal("fetch", network);
    const result = await request("https://blocked.example/private/path?token=private");
    expect(result.status).toBe(200);
    expect(result.headers.get("X-Site-Icon-Source")).toBe("service");
    const service = new URL(String(network.mock.calls[2][0]));
    expect(service.origin).toBe("https://www.google.com");
    expect([...service.searchParams.entries()]).toEqual([["domain", "blocked.example"], ["sz", "64"]]);
  });

  it("bounds missing-site and service failures without caching them for an hour", async () => {
    const network = vi.fn().mockResolvedValueOnce(page("<head></head>")).mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", network);
    const result = await request("https://missing.example/");
    expect(result.status).toBe(204);
    expect(result.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(network).toHaveBeenCalledTimes(3);
  });

  it("rejects the real S2 unknown-site placeholder even if returned with status 200", async () => {
    const placeholder = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAACiElEQVQ4EaVTzU8TURCf2tJuS7tQtlRb6UKBIkQwkRRSEzkQgyEc6lkOKgcOph78Y+CgjXjDs2i44FXY9AMTlQRUELZapVlouy3d7kKtb0Zr0MSLTvL2zb75eL838xtTvV6H/xELBptMJojeXLCXyobnyog4YhzXYvmCFi6qVSfaeRdXdrfaU1areV5KykmX06rcvzumjY/1ggkR3Jh+bNf1mr8v1D5bLuvR3qDgFbvbBJYIrE1mCIoCrKxsHuzK+Rzvsi29+6DEbTZz9unijEYI8ObBgXOzlcrx9OAlXyDYKUCzwwrDQx1wVDGg089Dt+gR3mxmhcUnaWeoxwMbm/vzDFzmDEKMMNhquRqduT1KwXiGt0vre6iSeAUHNDE0d26NBtAXY9BACQyjFusKuL2Ry+IPb/Y9ZglwuVscdHaknUChqLF/O4jn3V5dP4mhgRJgwSYm+gV0Oi3XrvYB30yvhGa7BS70eGFHPoTJyQHhMK+F0ZesRVVznvXw5Ixv7/C10moEo6OZXbWvlFAF9FVZDOqEABUMRIkMd8GnLwVWg9/RkJF9sA4oDfYQAuzzjqzwvnaRUFxn/X2ZlmGLXAE7AL52B4xHgqAUqrC1nSNuoJkQtLkdqReszz/9aRvq90NOKdOS1nch8TpL555WDp49f3uAMXhACRjD5j4ykuCtf5PP7Fm1b0DIsl/VHGezzP1KwOiZQobFF9YyjSRYQETRENSlVzI8iK9mWlzckpSSCQHVALmN9Az1euDho9Xo8vKGd2rqooA8yBcrwHgCqYR0kMkWci08t/R+W4ljDCanWTg9TJGwGNaNk3vYZ7VUdeKsYJGFNkfSzjXNrSX20s4/h6kB81/271ghG17l+rPTAAAAAElFTkSuQmCC", "base64");
    const network = vi.fn().mockResolvedValueOnce(page("<head></head>"))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(placeholder, { headers: { "Content-Type": "image/png" } }));
    vi.stubGlobal("fetch", network);
    expect((await request("https://generic-placeholder.example/")).status).toBe(204);
  });

  it("blocks private DNS answers and redirects from declared images", async () => {
    lookup.mockResolvedValueOnce([{ address: "169.254.169.254", family: 4 }]);
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    expect((await request("https://private.example/")).status).toBe(204);
    expect(network).not.toHaveBeenCalled();
    lookup.mockImplementation(async (host: string) => [{ address: host === "internal.example" ? "10.0.0.2" : "8.8.8.8", family: 4 }]);
    network.mockResolvedValueOnce(page('<head><link rel="icon" href="/logo.svg"></head>'))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "http://internal.example/metadata" } }))
      .mockRejectedValue(new Error("unavailable"));
    expect((await request("https://redirect.example/")).status).toBe(204);
    expect(network.mock.calls.some(([url]) => String(url).includes("internal.example"))).toBe(false);
  });

  it("recognizes actual PNG/ICO/SVG file structures and rejects spoofed image bodies", () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE1cAAAAASUVORK5CYII=", "base64");
    expect(iconContentType(png)).toBe("image/png");
    const ico = Buffer.alloc(24); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); ico.writeUInt32LE(2, 14); ico.writeUInt32LE(22, 18);
    expect(iconContentType(ico)).toBe("image/x-icon");
    expect(iconContentType(Buffer.from(svg))).toBe("image/svg+xml");
    expect(iconContentType(Buffer.from("<html>oops</html>"))).toBeNull();
    expect(iconContentType(Buffer.from("image"))).toBeNull();
  });
});
