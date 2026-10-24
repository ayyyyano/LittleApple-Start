import { describe, expect, it } from "vitest";
import { parseConfigFile, parseCurrentConfig } from "@/lib/config-parser";
import { cloneDefaultConfig } from "@/lib/default-config";

describe("configuration parser", () => {
  it.each([undefined, "", "   ", "netease", " custom-provider "])("normalizes Meting server %s on load and import", (server) => {
    const config = cloneDefaultConfig();
    expect(config.labs.aplayer.meting.server).toBe("netease");
    const raw = { ...config, labs: { ...config.labs, aplayer: { ...config.labs.aplayer, meting: { ...config.labs.aplayer.meting, server } } } };
    const expected = server?.trim() || "netease";
    expect(parseCurrentConfig(raw).labs.aplayer.meting.server).toBe(expected);
    expect(parseConfigFile(JSON.stringify({ version: 4, config: raw })).config.labs.aplayer.meting.server).toBe(expected);
  });

  it("migrates and validates version 3 exports", () => {
    const config = cloneDefaultConfig();
    config.quickLinks.push({ id: "docs", title: "Docs", url: "https://example.com", openInNewTab: true });
    const parsed = parseConfigFile(JSON.stringify({ version: 3, exportedAt: "2026-09-30T00:00:00.000Z", config }));
    expect(parsed.version).toBe(4);
    expect(parsed.config.quickLinks).toHaveLength(1);
    expect(parsed.config.quickLinks[0].title).toBe("Docs");
  });

  it("migrates version 2 exports without losing existing links", () => {
    const parsed = parseConfigFile(JSON.stringify({
      version: 2,
      config: {
        version: 2,
        locale: "en",
        theme: { mode: "dark" },
        clock: { timezone: "Europe/London", useLocalTime: true, format24h: true, showSeconds: false, showNetworkWarning: true },
        search: { defaultEngineId: "example", suggestionsEnabled: false, engines: [{ id: "example", name: "Example", urlTemplate: "https://example.com/?q=%s" }] },
        quickLinks: [{ id: "docs", title: "Docs", url: "https://example.com", openInNewTab: true }],
        appearance: { backgroundType: "none", backgroundFit: "cover", positionDesktop: "right center", positionMobile: "center center", blur: 2, overlay: 40, glassOpacity: 70, glassBlur: 12, playBackgroundAudio: false },
        general: { autoDownloadConfig: false, minimized: false, showMinimizeWarning: true },
      },
    }));
    expect(parsed.version).toBe(4);
    expect(parsed.config.quickLinks[0].title).toBe("Docs");
    expect(parsed.config.appearance.focalX).toBe(100);
    expect(parsed.config.content.quote.type).toBe("hitokoto");
    expect(parsed.config.appearance.backgroundFit).toBe("fill");
  });

  it("rejects malformed JSON and unsupported versions", () => {
    expect(() => parseConfigFile("not json")).toThrow("INVALID_JSON");
    expect(() => parseConfigFile(JSON.stringify({ version: 99, config: {} }))).toThrow("UNSUPPORTED_CONFIG_VERSION");
  });

  it("drops unsafe user URLs while preserving a valid configuration", () => {
    const config = cloneDefaultConfig();
    const raw = { ...config, quickLinks: [{ id: "bad", title: "Bad", url: "javascript:alert(1)", openInNewTab: true }] };
    expect(parseCurrentConfig(raw).quickLinks).toEqual([]);
  });

  it("fills footer defaults for old configs and keeps safe custom fields", () => {
    const config = cloneDefaultConfig();
    const parsed = parseCurrentConfig({
      ...config,
      content: {
        ...config.content,
        footer: {
          showLegal: true,
          showCopyright: true,
          icpText: "  Custom ICP  ",
          icpUrl: "",
          policeText: "Police",
          policeUrl: "javascript:alert(1)",
          copyrightText: "Custom copyright",
        },
      },
    });
    expect(parsed.content.footer).toMatchObject({
      icpText: "Custom ICP",
      icpUrl: "",
      policeText: "Police",
      policeUrl: config.content.footer.policeUrl,
      copyrightText: "Custom copyright",
    });

    const old = parseCurrentConfig({ ...config, content: { ...config.content, footer: { showLegal: true, showCopyright: true } } });
    expect(old.content.footer).toEqual(config.content.footer);
  });

  it("keeps manual APlayer defaults when Meting fields are absent", () => {
    const config = cloneDefaultConfig();
    const parsed = parseCurrentConfig({
      ...config,
      labs: { aplayer: { enabled: false, position: "left", playlist: [] } },
    });
    expect(parsed.labs.aplayer.source).toBe("manual");
    expect(parsed.labs.aplayer.meting.enabled).toBe(false);
    expect(parsed.labs.aplayer.meting.mode).toBe("song");
  });

  it("defaults and validates the experimental custom cursor configuration", () => {
    const config = cloneDefaultConfig();
    const legacy = parseCurrentConfig({ ...config, labs: { aplayer: config.labs.aplayer } });
    expect(legacy.labs.customCursor).toEqual({ enabled: false, assetId: null, size: null, hotspotX: 0, hotspotY: 0 });

    const parsed = parseCurrentConfig({
      ...config,
      labs: { ...config.labs, customCursor: { enabled: true, assetId: "cursor" } },
    });
    expect(parsed.labs.customCursor).toEqual({ enabled: true, assetId: "cursor", size: null, hotspotX: 0, hotspotY: 0 });
  });

  it("parses legacy exports", () => {
    const parsed = parseConfigFile(JSON.stringify({
      config: { searchEngines: [{ name: "Bing", url: "https://www.bing.com/search?q=" }], selectedSearchEngine: "https://www.bing.com/search?q=" },
      background: { id: 1, type: "image/png", data: "data:image/png;base64,iVBORw0KGgo=" },
    }));
    expect(parsed.version).toBe(4);
    expect(parsed.background?.visual?.mimeType).toBe("image/png");
  });

  it("normalizes the former Standard surface to Material and defaults icon style to auto", () => {
    const config = cloneDefaultConfig();
    const parsed = parseCurrentConfig({ ...config, appearance: { ...config.appearance, surfaceMode: "standard", iconStyle: undefined } });
    expect(parsed.appearance.surfaceMode).toBe("material");
    expect(parsed.appearance.iconStyle).toBe("auto");
  });

  it("accepts explicit icon providers on top actions while preserving legacy omissions", () => {
    const config = cloneDefaultConfig();
    const parsed = parseCurrentConfig({ ...config, topActions: [
      { id: "one", title: "One", url: "https://example.com", icon: "github", openInNewTab: true },
      { id: "two", title: "Two", url: "https://example.com", icon: "public", iconProvider: "material", openInNewTab: true },
    ] });
    expect(parsed.topActions[0].iconProvider).toBeUndefined();
    expect(parsed.topActions[1].iconProvider).toBe("material");
  });

  it("parses search, weather, and local quick-link icon extensions", () => {
    const config = cloneDefaultConfig();
    const parsed = parseCurrentConfig({
      ...config,
      search: {
        ...config.search,
        suggestionProvider: "custom",
        suggestionApiUrl: "https://example.com/suggest?q={query}",
        translationEnabled: false,
        translationProvider: "google",
      },
      quickLinks: [{ id: "docs", title: "Docs", url: "https://example.com", iconAssetId: "quick-link-icon:link-123", openInNewTab: true }],
      content: { ...config.content, weather: { ...config.content.weather, latitude: 24.48, longitude: 118.09, autoLocate: true, temperatureUnit: "fahrenheit", refreshMinutes: 0 } },
    });
    expect(parsed.search).toMatchObject({ suggestionProvider: "custom", translationEnabled: false, translationProvider: "google" });
    expect(parsed.quickLinks[0].iconAssetId).toBe("quick-link-icon:link-123");
    expect(parsed.content.weather).toMatchObject({ latitude: 24.48, longitude: 118.09, autoLocate: true, temperatureUnit: "fahrenheit", refreshMinutes: 0 });
  });

  it("keeps valid local quick-link icon assets in configuration exports", () => {
    const config = cloneDefaultConfig();
    config.quickLinks = [{ id: "docs", title: "Docs", url: "https://example.com", iconAssetId: "quick-link-icon:docs", openInNewTab: true }];
    const parsed = parseConfigFile(JSON.stringify({
      version: 4,
      exportedAt: "2026-10-16T00:00:00.000Z",
      config,
      background: {
        quickLinkIcons: {
          "quick-link-icon:docs": { mimeType: "image/png", name: "docs.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
          "quick-link-icon:unsafe/path": { mimeType: "image/png", name: "bad.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
        },
      },
    }));

    expect(parsed.background?.quickLinkIcons).toEqual({
      "quick-link-icon:docs": { mimeType: "image/png", name: "docs.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
    });
  });

  it("keeps a valid custom cursor asset in configuration exports", () => {
    const config = cloneDefaultConfig();
    config.labs.customCursor = { ...config.labs.customCursor, enabled: true, assetId: "cursor" };
    const parsed = parseConfigFile(JSON.stringify({
      version: 4,
      exportedAt: "2026-10-16T00:00:00.000Z",
      config,
      background: {
        cursor: { mimeType: "image/png", name: "cursor.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
      },
    }));
    expect(parsed.background?.cursor?.name).toBe("cursor.png");
  });
});
