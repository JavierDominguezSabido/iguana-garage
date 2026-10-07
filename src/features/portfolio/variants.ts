import { isUuid } from "@/features/jobs/validation";

export const PREPARED_IMAGE_WIDTHS = [320, 390, 640, 768, 1600] as const;
export type PreparedWidth = typeof PREPARED_IMAGE_WIDTHS[number];
export function preparedWidth(requested: number): PreparedWidth {
  if (!Number.isInteger(requested) || requested <= 0) throw new Error("Fotografía no disponible");
  return PREPARED_IMAGE_WIDTHS.find(width => width >= requested) ?? 1600;
}
export function derivativePath(job: string, media: string, width: PreparedWidth): string {
  if (!isUuid(job) || !isUuid(media) || !PREPARED_IMAGE_WIDTHS.includes(width)) throw new Error("Fotografía no disponible");
  return width === 1600 ? `${job}/${media}.webp` : `${job}/${media}/${width}.webp`;
}
export function derivativePaths(job: string, media: string): string[] {
  return PREPARED_IMAGE_WIDTHS.map(width => derivativePath(job, media, width));
}
