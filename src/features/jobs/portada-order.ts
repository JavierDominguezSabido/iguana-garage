// Orden de los trabajos en la pantalla «Portada»: igual que la web para los publicados (el fijado primero, luego fecha
// descendente y UUID ascendente) y los privados al final con el mismo criterio. Compartido por el servidor y el cliente.
export type OrderableJob = { id: string; job_date: string; is_public: boolean };
export function sortPortadaJobs<T extends OrderableJob>(jobs: readonly T[], pinnedId: string | null | undefined): T[] {
  const pinned = (job: T) => Number(job.is_public && job.id === pinnedId);
  return [...jobs].sort((a, b) => Number(b.is_public) - Number(a.is_public) || pinned(b) - pinned(a)
    || (a.job_date < b.job_date ? 1 : a.job_date > b.job_date ? -1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Orden manual del muro: los publicados por wall_position (los empates, por fecha descendente y UUID ascendente) y los
// privados al final por fecha, fuera del orden manual. Es el criterio de la proyección pública.
export type WallOrderable = OrderableJob & { wall_position: number | null };
export function sortByWall<T extends WallOrderable>(jobs: readonly T[]): T[] {
  const byDate = (a: T, b: T) => (a.job_date < b.job_date ? 1 : a.job_date > b.job_date ? -1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return [...jobs].sort((a, b) => Number(b.is_public) - Number(a.is_public)
    || (a.is_public ? (a.wall_position ?? Number.MAX_SAFE_INTEGER) - (b.wall_position ?? Number.MAX_SAFE_INTEGER) : 0) || byDate(a, b));
}
