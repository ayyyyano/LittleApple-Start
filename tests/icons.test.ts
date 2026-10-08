import { describe, expect, it } from "vitest";
import { MATERIAL_SYMBOL_NAMES, normalizeIconStyle, resolveIconProvider, isMaterialIconName } from "@/lib/icons";
import { canUseLiquidRenderer } from "@/lib/theme";

describe("semantic icon providers", () => {
  it("resolves Auto by theme and keeps explicit providers authoritative", () => {
    expect(resolveIconProvider("auto", "minimal")).toBe("feather");
    expect(resolveIconProvider("auto", "material")).toBe("material");
    expect(resolveIconProvider("auto", "liquid")).toBe("feather");
    expect(resolveIconProvider("feather", "material")).toBe("feather");
    expect(resolveIconProvider("material", "minimal")).toBe("material");
  });

  it("normalizes missing or unknown icon styles to Auto", () => {
    expect(normalizeIconStyle(undefined)).toBe("auto");
    expect(normalizeIconStyle("unknown")).toBe("auto");
    expect(normalizeIconStyle("material")).toBe("material");
  });

  it("uses Material Symbols for every fixed UI slot in Material Auto mode", () => {
    expect(resolveIconProvider("auto", "material")).toBe("material");
    expect(resolveIconProvider("auto", "minimal")).toBe("feather");
    expect(resolveIconProvider("auto", "liquid")).toBe("feather");
  });

  it("keeps the Settings mappings semantic rather than name-based", () => {
    expect(MATERIAL_SYMBOL_NAMES.appearance).toBe("palette");
    expect(MATERIAL_SYMBOL_NAMES.link).toBe("link");
    expect(MATERIAL_SYMBOL_NAMES.content).toBe("widgets");
    expect(MATERIAL_SYMBOL_NAMES.data).toBe("database");
    expect(MATERIAL_SYMBOL_NAMES.about).toBe("info");
    expect(MATERIAL_SYMBOL_NAMES.clock).toBe("schedule");
    expect(MATERIAL_SYMBOL_NAMES.system).toBe("desktop_windows");
    expect(isMaterialIconName("appearance")).toBe(true);
    expect(isMaterialIconName("unknown")).toBe(false);
  });

  it("maps common utility actions to unambiguous Material Symbols", () => {
    expect(MATERIAL_SYMBOL_NAMES.image).toBe("image");
    expect(MATERIAL_SYMBOL_NAMES.video).toBe("video_file");
    expect(MATERIAL_SYMBOL_NAMES.audio).toBe("audio_file");
    expect(MATERIAL_SYMBOL_NAMES.download).toBe("download");
    expect(MATERIAL_SYMBOL_NAMES.upload).toBe("upload");
    expect(MATERIAL_SYMBOL_NAMES.reset).toBe("restart_alt");
    expect(MATERIAL_SYMBOL_NAMES.externalLink).toBe("open_in_new");
    expect(MATERIAL_SYMBOL_NAMES.drag).toBe("drag_indicator");
  });

  it("mounts the Liquid renderer only for the Liquid theme and a supported surface", () => {
    expect(canUseLiquidRenderer("minimal", true, true)).toBe(false);
    expect(canUseLiquidRenderer("material", true, true)).toBe(false);
    expect(canUseLiquidRenderer("liquid", false, true)).toBe(false);
    expect(canUseLiquidRenderer("liquid", true, false)).toBe(false);
    expect(canUseLiquidRenderer("liquid", true, true)).toBe(true);
  });
});
