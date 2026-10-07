import sharp from "sharp";
import { validateImageBytes } from "./validation";
import { PREPARED_IMAGE_WIDTHS, type PreparedWidth } from "@/features/portfolio/variants";

export async function processJobImage(bytes: Uint8Array, mime: string): Promise<{ webp: Buffer; variants: Record<PreparedWidth, Buffer>; width: number; height: number }> {
  validateImageBytes(bytes, mime);
  const image = sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (metadata.format !== formats[mime] || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new Error("Imagen no compatible");
  const swapped = (metadata.orientation ?? 1) >= 5;
  // Sharp retira metadatos por defecto. No withMetadata/keepMetadata en derivados.
  const variants = {} as Record<PreparedWidth, Buffer>;
  // Secuencial: memoria de un encoder a la vez incluso con fotos de móvil grandes.
  for (const width of PREPARED_IMAGE_WIDTHS) {
    const webp = await image.clone().rotate().resize({ width, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: width === 1600 ? 82 : 78 }).toBuffer();
    if (webp.length > 5 * 1024 * 1024) throw new Error("Derivado demasiado grande");
    variants[width] = webp;
  }
  return { webp: variants[1600], variants, width: swapped ? metadata.height : metadata.width, height: swapped ? metadata.width : metadata.height };
}
