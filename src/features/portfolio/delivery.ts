import { isUuid } from "@/features/jobs/validation";
import type { PublicJob } from "./contract";

export const PUBLIC_IMAGE_WIDTHS = [160, 320, 390, 640, 768, 1024, 1440, 1600];
export const PUBLIC_PAGE_SIZE = 12;
function validPhoto(job: string, media: string, width: number, retry: number) {
  if (!isUuid(job) || !isUuid(media) || !PUBLIC_IMAGE_WIDTHS.includes(width) || !Number.isInteger(retry) || retry < 0 || retry > 3) throw new Error("Fotografía no disponible");
}
export function publicPhotoUrl(job: string, media: string, width: number, retry = 0): string {
  validPhoto(job, media, width, retry);
  return `/api/portfolio/photos/${job}/${media}?w=${width}&r=${retry}`;
}
export function photoRequest(job: string, media: string, url: URL): { path: string; width: number } {
  if ([...url.searchParams.keys()].some((key) => !["w", "r"].includes(key)) || url.searchParams.getAll("w").length !== 1 || url.searchParams.getAll("r").length > 1) throw new Error("Fotografía no disponible");
  const width = Number(url.searchParams.get("w"));
  const retry = Number(url.searchParams.get("r") ?? "0");
  validPhoto(job, media, width, retry);
  return { path: `${job}/${media}.webp`, width };
}
export function portfolioPage(input?: string): number {
  return input && /^[1-9]\d{0,3}$/.test(input) ? Number(input) : 1;
}
export function portfolioHero(jobs: readonly PublicJob[]): PublicJob | undefined {
  // El listado mantiene su orden: el hero aporta una imagen de otro trabajo de esta página.
  return jobs.findLast((job, index) => index > 0 && job.media.length > 0);
}
export function publicDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
