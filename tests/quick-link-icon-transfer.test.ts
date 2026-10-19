import { beforeEach, describe, expect, it, vi } from "vitest";
import { cloneDefaultConfig } from "@/lib/default-config";
import { createConfigExport, applyImportedConfiguration } from "@/services/configuration-transfer";
import { parseConfigFile } from "@/lib/config-parser";

const { assets, restored, saved } = vi.hoisted(() => ({ assets: new Map(), restored: vi.fn(), saved: vi.fn() }));
vi.mock("@/services/background-storage", () => ({
  getBackgroundAsset: async (id: string) => assets.get(id),
  serializeBackgroundAsset: async (id: string) => assets.get(id)?.serialized,
  clearBackgroundAssets: async () => assets.clear(),
  restoreSerializedAsset: restored,
}));
vi.mock("@/services/config-storage", () => ({ saveStoredConfig: saved, clearLegacyStorage: vi.fn(), removeStoredConfig: vi.fn() }));
beforeEach(() => { assets.clear(); vi.clearAllMocks(); });

describe("custom Quick Link icon transfer", () => {
  it("exports and restores uploaded images and manual URLs without adding automatic network cache", async () => {
    const config = cloneDefaultConfig();
    config.quickLinks = [
      { id: "uploaded", title: "Local", url: "https://local.example", iconAssetId: "quick-link-icon:uploaded", openInNewTab: true },
      { id: "manual", title: "Manual", url: "https://manual.example", icon: "https://cdn.example/custom.png", openInNewTab: true },
      { id: "automatic", title: "Automatic", url: "https://automatic.example", openInNewTab: true },
    ];
    const serialized = { name: "local.png", mimeType: "image/png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
    assets.set("quick-link-icon:uploaded", { blob: new Blob(["image"]), serialized });
    const { payload } = await createConfigExport(config);
    const imported = parseConfigFile(JSON.stringify(payload));
    expect(imported.background?.quickLinkIcons).toEqual({ "quick-link-icon:uploaded": serialized });
    await applyImportedConfiguration(imported);
    expect(restored).toHaveBeenCalledExactlyOnceWith("quick-link-icon:uploaded", serialized);
    expect(saved.mock.calls[0][0].quickLinks).toEqual(config.quickLinks);
  });
});
