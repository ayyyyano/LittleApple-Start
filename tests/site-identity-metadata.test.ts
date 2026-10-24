import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { cloneDefaultConfig } from "@/lib/default-config";
import { parseConfigFile, parseCurrentConfig } from "@/lib/config-parser";
import { SiteIdentityMetadata } from "@/components/layout/SiteIdentityMetadata";
import { metadata } from "@/app/layout";

const app = vi.hoisted(() => ({ config: null as ReturnType<typeof cloneDefaultConfig> | null }));
vi.mock("@/components/providers/AppProvider", () => ({ useApp: () => ({ config: app.config, assetRevision: 0, deploymentDefaults: {} }) }));

describe("browser site identity title ownership", () => {
  it("renders a built-in title before local configuration is available", () => {
    app.config = cloneDefaultConfig();
    expect(renderToStaticMarkup(createElement(SiteIdentityMetadata))).toBe("<title>LittleApple Start</title>");
  });

  it("renders the saved and imported user name as the sole React-owned title", () => {
    const config = cloneDefaultConfig();
    config.siteIdentity.name = "My <Start> & 起始页";
    for (const restored of [parseCurrentConfig(JSON.parse(JSON.stringify(config))), parseConfigFile(JSON.stringify({ version: 4, config })).config]) {
      app.config = restored;
      const html = renderToStaticMarkup(createElement(SiteIdentityMetadata));
      expect(html.match(/<title>/g)).toHaveLength(1);
      expect(html).toContain("<title>My &lt;Start&gt; &amp; 起始页</title>");
    }
    expect(metadata.title).toBeUndefined();
  });

  it("uses the built-in fallback for a cleared name", () => {
    app.config = cloneDefaultConfig();
    app.config.siteIdentity.name = "   ";
    expect(renderToStaticMarkup(createElement(SiteIdentityMetadata))).toBe("<title>LittleApple Start</title>");
  });
});
