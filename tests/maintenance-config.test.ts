import { describe, expect, it } from "vitest";
import { cloneDefaultConfig } from "@/lib/default-config";
import { parseConfigFile, parseCurrentConfig } from "@/lib/config-parser";
import { migrateLegacyConfig } from "@/lib/config-migrations";

describe("P1/P2 configuration compatibility", () => {
  it("fills missing settings without changing legacy request or cursor behavior", () => {
    const old = JSON.parse(JSON.stringify(cloneDefaultConfig()));
    delete old.search.suggestionTransport;
    delete old.search.suggestionProxyUrl;
    old.labs.customCursor = { enabled: true, assetId: "cursor" };
    const config = parseCurrentConfig(old);
    expect(config.search.suggestionTransport).toBe("auto");
    expect(config.search.suggestionProxyUrl).toBe("");
    expect(config.labs.customCursor).toEqual({ enabled: true, assetId: "cursor", size: null, hotspotX: 0, hotspotY: 0 });
  });

  it("round-trips proxy, engine opt-out, cursor settings and added timezones in exports", () => {
    const config = cloneDefaultConfig();
    config.search.suggestionTransport = "custom";
    config.search.suggestionProxyUrl = "https://proxy.example/?url={url}";
    config.search.engines[0].suggestionsEnabled = false;
    config.labs.customCursor = { enabled: true, assetId: "cursor", size: 48, hotspotX: 9, hotspotY: 12 };
    config.clock.timezone = "Australia/Sydney";
    const result = parseConfigFile(JSON.stringify({ version: 4, config })).config;
    expect(result.search).toEqual(config.search);
    expect(result.labs.customCursor).toEqual(config.labs.customCursor);
    expect(result.clock.timezone).toBe("Australia/Sydney");
  });

  it("bounds invalid settings and preserves legacy engine opt-outs", () => {
    const config = cloneDefaultConfig();
    const result = parseCurrentConfig({ ...config, search: { ...config.search, suggestionTransport: "bad", suggestionProxyUrl: "javascript:bad" }, labs: { ...config.labs, customCursor: { enabled: true, size: 999, hotspotX: -5, hotspotY: 999 } } });
    expect(result.search.suggestionTransport).toBe("auto");
    expect(result.search.suggestionProxyUrl).toBe("");
    expect(result.labs.customCursor).toMatchObject({ size: 128, hotspotX: 0, hotspotY: 127 });
    const legacy = migrateLegacyConfig({ searchEngines: [{ name: "Private", url: "https://example.com/?q=%s", suggest: false }], suggestProxy: "none" });
    expect(legacy.search.engines[0].suggestionsEnabled).toBe(false);
    expect(legacy.search.suggestionTransport).toBe("direct");
  });
});
