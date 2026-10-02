import { describe, expect, it } from "vitest";
import { migrateLegacyConfig } from "@/lib/config-migrations";

describe("legacy configuration migration", () => {
  it("maps legacy fields and preserves URL prefixes", () => {
    const migrated = migrateLegacyConfig({
      searchEngines: [{ name: "Legacy", url: "https://example.com/search?q=" }],
      selectedSearchEngine: "https://example.com/search?q=",
      selectedLanguage: "zh-TW",
      timezone: "Europe/London",
      useLocalTime: true,
      showLocalTimeWarning: false,
      playBackgroundAudio: true,
      autoSaveConfig: true,
      minimized: true,
      showMinimizeWarning: false,
    });

    expect(migrated.version).toBe(4);
    expect(migrated.locale).toBe("zh-TW");
    expect(migrated.search.engines[0].urlTemplate).toBe("https://example.com/search?q=");
    expect(migrated.search.defaultEngineId).toBe(migrated.search.engines[0].id);
    expect(migrated.clock).toMatchObject({ timezone: "Europe/London", useLocalTime: true, showNetworkWarning: false });
    expect(migrated.appearance.playBackgroundAudio).toBe(true);
    expect(migrated.appearance).toMatchObject({ backgroundFit: "fill", themeStrength: "standard", surfaceMode: "liquid" });
    expect(migrated.content.weather.enabled).toBe(false);
    expect(migrated.labs.aplayer.enabled).toBe(false);
    expect(migrated.general.motionEnabled).toBe(true);
    expect(migrated.general).toMatchObject({ autoDownloadConfig: true, minimized: true, showMinimizeWarning: false });
  });
});
