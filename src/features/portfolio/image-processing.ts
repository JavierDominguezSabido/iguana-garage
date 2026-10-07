import sharp from "sharp";
import { PUBLIC_IMAGE_WIDTHS } from "./delivery";

export async function resizePublicPhoto(bytes: Uint8Array, width: number): Promise<Buffer> {
  if (![...PUBLIC_IMAGE_WIDTHS,160,1024,1440].includes(width) || bytes.length > 5 * 1024 * 1024) throw new Error("Fotografía no disponible");
  const image = sharp(Buffer.from(bytes), { limitInputPixels: 1600 * 1600, failOn: "warning" });
  const metadata = await image.metadata();
  if (metadata.format !== "webp" || (metadata.pages ?? 1) !== 1) throw new Error("Fotografía no disponible");
  return image.resize({ width, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}
