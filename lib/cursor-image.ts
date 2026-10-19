import { cursorGeometry, type CursorImageSettings } from "@/lib/custom-cursor";

export async function prepareCursorPresentation(blob: Blob, settings: CursorImageSettings) {
  const imageUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const geometry = cursorGeometry(image.naturalWidth, image.naturalHeight, settings);
    if (geometry.width === image.naturalWidth && geometry.height === image.naturalHeight) return { blob, ...geometry };
    const canvas = document.createElement("canvas");
    canvas.width = geometry.width;
    canvas.height = geometry.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CURSOR_CANVAS_UNAVAILABLE");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const resized = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("CURSOR_CONVERSION_FAILED")), "image/png"));
    return { blob: resized, ...geometry };
  } finally { URL.revokeObjectURL(imageUrl); }
}
