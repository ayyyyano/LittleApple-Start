import { describe, expect, it } from "vitest";
import { applyDeploymentDefaults, normalizeDeploymentDefaults, parseDeploymentDefaults } from "@/lib/deployment-defaults";
import { cloneDefaultConfig } from "@/lib/default-config";

describe("deployment defaults", () => {
  it("ignores unset, empty, and invalid values", () => {
    expect(parseDeploymentDefaults({
      LITTLEAPPLE_DEFAULT_SITE_NAME: " ",
      LITTLEAPPLE_DEFAULT_BACKGROUND_URL: "not a url",
      LITTLEAPPLE_DEFAULT_ICP_ENABLED: "abc",
      LITTLEAPPLE_DEFAULT_POLICE_ENABLED: "2",
    })).toEqual({});
  });

  it("parses strict booleans and public values", () => {
    expect(parseDeploymentDefaults({
      LITTLEAPPLE_DEFAULT_SITE_NAME: "  Self Hosted  ",
      LITTLEAPPLE_DEFAULT_BACKGROUND_URL: "/background.webp",
      LITTLEAPPLE_DEFAULT_FAVICON_URL: "https://example.com/icon.png",
      LITTLEAPPLE_DEFAULT_ICP_ENABLED: "0",
      LITTLEAPPLE_DEFAULT_POLICE_ENABLED: "true",
      LITTLEAPPLE_DEFAULT_COPYRIGHT_ENABLED: "false",
      LITTLEAPPLE_DEFAULT_COPYRIGHT_TEXT: "© 2026 Self Hosted",
    })).toEqual({
      siteName: "Self Hosted",
      backgroundUrl: "/background.webp",
      faviconUrl: "https://example.com/icon.png",
      footer: {
        icpEnabled: false,
        policeEnabled: true,
        copyrightEnabled: false,
        copyrightText: "© 2026 Self Hosted",
      },
    });
  });

  it("applies only the explicit deployment mappings", () => {
    const builtIn = cloneDefaultConfig();
    const next = applyDeploymentDefaults(builtIn, normalizeDeploymentDefaults({
      siteName: "Deployment Start",
      backgroundUrl: "https://example.com/background.webp",
      footer: { icpEnabled: false, policeText: "Police record", copyrightEnabled: true },
    }));

    expect(next.siteIdentity.name).toBe("Deployment Start");
    expect(next.appearance.backgroundType).toBe("image");
    expect(next.appearance.backgroundUrl).toBe("https://example.com/background.webp");
    expect(next.content.footer.showIcp).toBe(false);
    expect(next.content.footer.showPolice).toBe(true);
    expect(next.content.footer.policeText).toBe("Police record");
    expect(next.theme).toEqual(builtIn.theme);
    expect(next.search).toEqual(builtIn.search);
    expect(next.labs).toEqual(builtIn.labs);
  });

  it("accepts boolean values from the runtime JSON payload", () => {
    expect(normalizeDeploymentDefaults({ footer: { icpEnabled: false, policeEnabled: true } })).toEqual({
      footer: { icpEnabled: false, policeEnabled: true },
    });
  });
});
