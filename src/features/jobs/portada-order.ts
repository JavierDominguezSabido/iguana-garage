// Orden de los trabajos en la pantalla «Portada» y en el muro. Compartido por el servidor y el cliente.
export const PORTADA_PAGE_SIZE = 12;
export type OrderableJob = { id: string; job_date: string; is_public: boolean };

// Orden manual del muro: los publicados por wall_position (los empates, por fecha descendente y UUID ascendente) y los
// privados al final por fecha, fuera del orden manual. Es el criterio de la proyección pública.
export type WallOrderable = OrderableJob & { wall_position: number | null };
export function sortByWall<T extends WallOrderable>(jobs: readonly T[]): T[] {
  const byDate = (a: T, b: T) => (a.job_date < b.job_date ? 1 : a.job_date > b.job_date ? -1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return [...jobs].sort((a, b) => Number(b.is_public) - Number(a.is_public)
    || (a.is_public ? (a.wall_position ?? Number.MAX_SAFE_INTEGER) - (b.wall_position ?? Number.MAX_SAFE_INTEGER) : 0) || byDate(a, b));
}
