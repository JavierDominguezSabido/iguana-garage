// Distribución del muro de fotos de un trabajo: filas de hasta cuatro, sin dejar nunca una foto sola
// (salvo cuando el trabajo solo tiene una). Escritorio usa 12 columnas; móvil, dos.
const MAX_PER_ROW = 4;
const GRID_COLUMNS = 12;
const SINGLE_SPAN = 4;

export function wallRows(count: number): number[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  const rows: number[] = [];
  for (let left = count; left > 0; left -= MAX_PER_ROW) rows.push(Math.min(MAX_PER_ROW, left));
  if (rows.length > 1 && rows[rows.length - 1] === 1) { rows[rows.length - 2] -= 1; rows[rows.length - 1] = 2; }
  return rows;
}
export type WallTile = { span: number; wide: boolean };
export function wallLayout(count: number): WallTile[] {
  const rows = wallRows(count);
  const odd = count % 2 === 1;
  let index = 0;
  return rows.flatMap((length) => Array.from({ length }, () => ({ span: length === 1 ? SINGLE_SPAN : GRID_COLUMNS / length, wide: odd && index++ === 0 })));
}
