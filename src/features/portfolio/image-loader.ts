import { publicPhotoUrl } from "./delivery";
import { preparedWidth } from "./variants";

// Adaptar las sondas de Next/Image a variantes existentes; el endpoint conserva su validación.
export function publicImageUrl(jobId: string, mediaId: string, requestedWidth: number, retry = 0): string {
  if (!Number.isInteger(requestedWidth) || requestedWidth <= 0) throw new Error("Fotografía no disponible");
  const width = preparedWidth(requestedWidth);
  return publicPhotoUrl(jobId, mediaId, width, retry);
}
