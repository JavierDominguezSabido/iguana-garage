// Tira horizontal del visor: solo se montan la foto actual y sus dos vecinas (anterior y siguiente), de modo que al
// pasar ya están descargadas y decodificadas. Nunca se monta la misma foto dos veces (cada una pediría su descarga).
export type StripSlide = { index: number; offset: -1 | 0 | 1 };
export const EDGE_RESISTANCE = 0.25;

export function stripSlides(index: number, count: number): StripSlide[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  if (count === 1) return [{ index, offset: 0 }];
  // Con dos fotos la otra va a su lado natural (la primera a la derecha, la segunda a la izquierda).
  if (count === 2) return [{ index, offset: 0 }, { index: 1 - index, offset: index === 0 ? 1 : -1 }];
  return [{ index: (index - 1 + count) % count, offset: -1 }, { index, offset: 0 }, { index: (index + 1) % count, offset: 1 }];
}
export function stripTarget(index: number, count: number, direction: 1 | -1): number {
  return (index + direction + count) % count;
}
// Se puede arrastrar hacia donde hay una foto montada al otro lado.
export function canDrag(index: number, count: number, direction: 1 | -1): boolean {
  if (count < 2) return false;
  if (count === 2) return direction === (index === 0 ? 1 : -1);
  return true;
}
// Desplazamiento de la tira mientras dura el gesto: sigue al dedo hasta un ancho; hacia un lado sin foto solo cede un poco.
export function dragOffset(dx: number, width: number, allowed: boolean): number {
  if (!Number.isFinite(dx) || !(width > 0)) return 0;
  const value = allowed ? dx : dx * EDGE_RESISTANCE;
  const limit = allowed ? width : width * EDGE_RESISTANCE;
  return Math.max(-limit, Math.min(limit, value));
}
