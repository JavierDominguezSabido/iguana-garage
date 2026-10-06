import { PUBLIC_IMAGE_WIDTHS, publicPhotoUrl } from "./delivery";

// Adaptar las sondas de Next/Image a variantes existentes; el endpoint conserva su validación.
export function publicImageUrl(jobId: string, mediaId: string, requestedWidth: number, retry = 0): string {
  if (!Number.isInteger(requestedWidth) || requestedWidth <= 0) throw new Error("Fotografía no disponible");
  const width = PUBLIC_IMAGE_WIDTHS.find((candidate) => candidate >= requestedWidth) ?? PUBLIC_IMAGE_WIDTHS[PUBLIC_IMAGE_WIDTHS.length - 1];
  return publicPhotoUrl(jobId, mediaId, width, retry);
}
