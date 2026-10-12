import type { PublicJob } from "./contract";

export type FanCard = { job: PublicJob; photo: PublicJob["media"][number]; primary: boolean };

// Abanico de la portada: primero la primera foto visible de cada trabajo (orden del muro); si faltan cartas,
// las siguientes de cada uno. Solo las principales son enlaces navegables; las repetidas son decorativas.
export function fanCards(jobs: readonly PublicJob[], max = 7): FanCard[] {
  const cards: FanCard[] = [];
  for (let index = 0; cards.length < max && jobs.some(job => job.media.length > index); index++) {
    for (const job of jobs) if (job.media[index] && cards.length < max) cards.push({ job, photo: job.media[index], primary: index === 0 });
  }
  return cards;
}
// Posición de una carta en el abanico: de -0,5 (izquierda) a 0,5 (derecha).
export const fanSlot = (index: number, count: number) => (count > 1 ? index / (count - 1) - 0.5 : 0);

// Mosaico de un trabajo: dos columnas escalonadas (una si solo hay una foto). Cada foto conserva su índice del muro.
export function mosaicColumns<T>(items: readonly T[]): { item: T; index: number }[][] {
  const columns = items.length > 1 ? 2 : 1;
  return Array.from({ length: columns }, (_, column) => items.map((item, index) => ({ item, index })).filter(({ index }) => index % columns === column));
}
const MOSAIC_RATIOS = ["4 / 5", "1 / 1", "3 / 5", "3 / 4", "4 / 5"] as const;
export const mosaicRatio = (index: number) => MOSAIC_RATIOS[index % MOSAIC_RATIOS.length];
