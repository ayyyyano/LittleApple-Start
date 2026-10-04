import { describe, expect, it } from "vitest";
import { parseConfigFile, parseCurrentConfig } from "@/lib/config-parser";
import { cloneDefaultConfig } from "@/lib/default-config";

describe("configuration parser", () => {
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

  it("parses legacy exports", () => {
    const parsed = parseConfigFile(JSON.stringify({
      config: { searchEngines: [{ name: "Bing", url: "https://www.bing.com/search?q=" }], selectedSearchEngine: "https://www.bing.com/search?q=" },
      background: { id: 1, type: "image/png", data: "data:image/png;base64,iVBORw0KGgo=" },
    }));
    expect(parsed.version).toBe(4);
    expect(parsed.background?.visual?.mimeType).toBe("image/png");
  });
});
