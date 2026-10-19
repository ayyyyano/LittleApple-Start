import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareCursorPresentation } from "@/lib/cursor-image";

beforeEach(() => {
  vi.stubGlobal("Image", class {
    naturalWidth = 64;
    naturalHeight = 32;
    src = "";
    decode = async () => undefined;
  });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cursor-source");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("custom cursor presentation", () => {
  it("keeps the original image, including animation, when no resize is requested", async () => {
    const blob = new Blob(["original"], { type: "image/gif" });
    const result = await prepareCursorPresentation(blob, { size: null, hotspotX: 4, hotspotY: 8 });
    expect(result.blob).toBe(blob);
    expect(result).toMatchObject({ width: 64, height: 32, hotspotX: 4, hotspotY: 8 });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:cursor-source");
  });

  it("scales only when requested and clamps the effective click point", async () => {
    const drawImage = vi.fn();
    const resized = new Blob(["resized"], { type: "image/png" });
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (callback: BlobCallback) => callback(resized) };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    const result = await prepareCursorPresentation(new Blob(["original"]), { size: 32, hotspotX: 50, hotspotY: 50 });
    expect(result).toEqual({ blob: resized, width: 32, height: 16, hotspotX: 31, hotspotY: 15 });
    expect(canvas).toMatchObject({ width: 32, height: 16 });
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("releases temporary resources even when decoding fails", async () => {
    vi.stubGlobal("Image", class { src = ""; decode = async () => { throw new Error("bad image"); }; });
    await expect(prepareCursorPresentation(new Blob(), { size: null, hotspotX: 0, hotspotY: 0 })).rejects.toThrow("bad image");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
