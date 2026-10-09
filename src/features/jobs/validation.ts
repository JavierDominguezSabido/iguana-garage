export type JobInput = { name: string; job_date: string; paint_code: string | null; work_hours: number | null; description: string | null; is_public: boolean };
export type FocalPoint = { focal_x: number; focal_y: number };
export const MAX_WORK_HOURS = 999.99;
export const MAX_DESCRIPTION = 500;
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

// Texto del formulario ("12,5", "8", "") -> horas exactas con 2 decimales como maximo; vacio = sin dato.
export function parseWorkHours(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(text)) throw new Error("Horas inválidas");
  return Number(text.replace(",", "."));
}
function validWorkHours(value: unknown): value is number | null | undefined {
  if (value == null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_WORK_HOURS && Number.isInteger(Number((value * 100).toFixed(6)));
}
// Texto plano: sin caracteres de control (salvo saltos de línea), recortado, vacío = sin dato.
function plainDescription(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error("Descripción inválida");
  const text = value.replace(/\r\n?|\r/g, "\n").trim();
  if (/[\u0000-\u0009\u000B-\u001F\u007F]/.test(text) || text.length > MAX_DESCRIPTION) throw new Error("Descripción inválida");
  return text || null;
}

export function validateJob(input: unknown): JobInput {
  const data = fields(input, ["name", "job_date", "paint_code", "work_hours", "description", "is_public"]);
  if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 200 || !isCalendarDate(data.job_date) ||
      (data.paint_code != null && (typeof data.paint_code !== "string" || data.paint_code.trim().length > 80)) ||
      (data.is_public !== undefined && typeof data.is_public !== "boolean") || !validWorkHours(data.work_hours)) throw new Error("Trabajo inválido");
  return {
    name: data.name.trim(), job_date: data.job_date,
    paint_code: typeof data.paint_code === "string" ? data.paint_code.trim() || null : null,
    work_hours: data.work_hours ?? null, description: plainDescription(data.description),
    is_public: data.is_public === true,
  };
}

// Punto focal: porcentajes enteros 0–100 (50/50 = centro). Solo presentación; no toca ninguna imagen.
export function validateFocalPoint(input: unknown): FocalPoint {
  const data = fields(input, ["focal_x", "focal_y"]);
  const valid = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
  if (!valid(data.focal_x) || !valid(data.focal_y)) throw new Error("Encuadre inválido");
  return { focal_x: data.focal_x, focal_y: data.focal_y };
}

// Visibilidad de una foto en la home (hidden_from_home). Solo presentación pública; no toca ninguna imagen.
export function validatePhotoVisibility(input: unknown): { hidden: boolean } {
  const data = fields(input, ["hidden"]);
  if (typeof data.hidden !== "boolean") throw new Error("Visibilidad inválida");
  return { hidden: data.hidden };
}

// Orden de las fotos de un trabajo: lista completa de UUID sin repetir. La base de datos comprueba que sea el conjunto exacto.
export const MAX_ORDER_PHOTOS = 200;
export function validatePhotoOrder(input: unknown): { order: string[] } {
  const data = fields(input, ["order"]);
  const order = data.order;
  if (!Array.isArray(order) || !order.length || order.length > MAX_ORDER_PHOTOS || !order.every(isUuid) || new Set(order).size !== order.length) throw new Error("Orden inválido");
  return { order: [...order] };
}

// Ajustes de portada: o bien el trabajo fijado (null = ninguno), o bien la transformación destacada (null = quitarla).
export type FeaturedSelection = { job_id: string; before_id: string; after_id: string };
export type PortfolioPatch = { pinned_job_id: string | null } | { featured: FeaturedSelection | null };
export function validatePortfolioPatch(input: unknown): PortfolioPatch {
  const data = fields(input, ["pinned_job_id", "featured"]);
  if (Object.keys(data).length !== 1) throw new Error("Ajuste inválido");
  if ("pinned_job_id" in data) {
    if (data.pinned_job_id !== null && !isUuid(data.pinned_job_id)) throw new Error("Trabajo inválido");
    return { pinned_job_id: data.pinned_job_id };
  }
  if (data.featured === null) return { featured: null };
  const featured = fields(data.featured, ["job_id", "before_id", "after_id"]);
  if (!isUuid(featured.job_id) || !isUuid(featured.before_id) || !isUuid(featured.after_id) || featured.before_id === featured.after_id) throw new Error("Transformación inválida");
  return { featured: { job_id: featured.job_id, before_id: featured.before_id, after_id: featured.after_id } };
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
