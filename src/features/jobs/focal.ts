import type { CSSProperties } from "react";

// Encuadre guardado en «Encuadre» (focal_x/focal_y, 0–100) aplicado a los recortes cover del área privada,
// igual que en la home pública. Sin valor válido, centro (50/50). La foto completa (principal y visor) no lo usa.
export type Focal = { focal_x?: number | null; focal_y?: number | null };
const CENTER = 50;
const axis = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : CENTER;

export function focalObjectPosition(focal?: Focal | null): string {
  return `${axis(focal?.focal_x)}% ${axis(focal?.focal_y)}%`;
}
export function focalStyle(focal?: Focal | null): CSSProperties {
  return { objectPosition: focalObjectPosition(focal) };
}
