export type JobInput = { name: string; job_date: string; paint_code: string | null; is_public: boolean };
export type MediaMetadata = { storage_path: string; mime_type: string; position: number; width: number | null; height: number | null; byte_size: number };

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function fields(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !allowed.includes(key))) {
    throw new Error("Datos inválidos");
  }
  return input as Record<string, unknown>;
}
function positiveInteger(value: unknown, max = 2147483647): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= max;
}

export function validateJob(input: unknown): JobInput {
  const data = fields(input, ["name", "job_date", "paint_code", "is_public"]);
  if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 200 || !isCalendarDate(data.job_date) ||
      (data.paint_code != null && (typeof data.paint_code !== "string" || data.paint_code.trim().length > 80)) ||
      (data.is_public !== undefined && typeof data.is_public !== "boolean")) throw new Error("Trabajo inválido");
  return {
    name: data.name.trim(), job_date: data.job_date,
    paint_code: typeof data.paint_code === "string" ? data.paint_code.trim() || null : null,
    is_public: data.is_public === true,
  };
}

export function buildOriginalPath(ownerId: string, jobId: string, mediaId: string, mime: string): string {
  if (![ownerId, jobId, mediaId].every(isUuid) || !Object.hasOwn(extensions, mime)) throw new Error("Ruta de imagen inválida");
  return `${ownerId}/${jobId}/${mediaId}.${extensions[mime as keyof typeof extensions]}`;
}

export function validateMediaMetadata(input: unknown, scope: { ownerId: string; jobId: string; mediaId: string }): MediaMetadata {
  const data = fields(input, ["storage_path", "mime_type", "position", "width", "height", "byte_size"]);
  if (typeof data.mime_type !== "string" || data.storage_path !== buildOriginalPath(scope.ownerId, scope.jobId, scope.mediaId, data.mime_type) ||
      typeof data.position !== "number" || !Number.isInteger(data.position) || data.position < 0 || data.position > 2147483647 ||
      !positiveInteger(data.byte_size, MAX_IMAGE_BYTES) ||
      (data.width != null && !positiveInteger(data.width)) || (data.height != null && !positiveInteger(data.height))) throw new Error("Metadatos de imagen inválidos");
  return { storage_path: data.storage_path as string, mime_type: data.mime_type, position: data.position,
    width: data.width == null ? null : data.width as number, height: data.height == null ? null : data.height as number, byte_size: data.byte_size };
}

// Filtro inicial de transporte. No sustituye decodificar/re-encodear en el futuro pipeline de subida.
export function validateImageBytes(bytes: Uint8Array, mime: string): void {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !Object.hasOwn(extensions, mime)) throw new Error("Imagen inválida");
  const matches = (signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);
  const valid = mime === "image/png" ? matches([137, 80, 78, 71, 13, 10, 26, 10]) :
    mime === "image/jpeg" ? matches([255, 216, 255]) :
      matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8);
  if (!valid) throw new Error("Imagen inválida");
}
