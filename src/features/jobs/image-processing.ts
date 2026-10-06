import sharp from "sharp";
import { validateImageBytes } from "./validation";

export async function processJobImage(bytes: Uint8Array, mime: string): Promise<{ webp: Buffer; width: number; height: number }> {
  validateImageBytes(bytes, mime);
  const image = sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (metadata.format !== formats[mime] || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new Error("Imagen no compatible");
  const swapped = (metadata.orientation ?? 1) >= 5;
  // Sharp retira metadatos por defecto. No withMetadata/keepMetadata en derivados.
  const webp = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  if (webp.length > 5 * 1024 * 1024) throw new Error("Derivado demasiado grande");
  return { webp, width: swapped ? metadata.height : metadata.width, height: swapped ? metadata.width : metadata.height };
}
