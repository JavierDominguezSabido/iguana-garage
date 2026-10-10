import Link from "next/link";
import { Icon } from "@/components/icon";
import { portadaJobs } from "@/features/jobs/curation";
import { PORTADA_PAGE_SIZE } from "@/features/jobs/portada-order";
import { privateContext } from "@/features/jobs/page-data";
import { PortadaScreen } from "@/features/jobs/portada";
export const metadata = { title: "Portada · Iguana Garage" };
export default async function PortadaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, user } = await privateContext();
  const page = Math.floor(Math.max(1, Math.min(10000, Number((await searchParams).page) || 1)));
  const { jobs, hasNext, settings, publishedTotal } = await portadaJobs(supabase, user.id, page);
  const featured = settings?.featured_job_id && settings.featured_before_id && settings.featured_after_id
    ? { jobId: settings.featured_job_id, beforeId: settings.featured_before_id, afterId: settings.featured_after_id } : null;
  const view = jobs.map(({ job, media }) => ({ id: job.id, name: job.name, job_date: job.job_date, is_public: job.is_public, wall_position: job.wall_position,
    photos: media.map((photo) => ({ id: photo.id, hidden: photo.hidden_from_home, focal_x: photo.focal_x, focal_y: photo.focal_y })) }));
  return <>
    <header className="page-head"><h1>Portada</h1><p className="page-sub">La página principal de la web, en su orden. Cada cambio se guarda al momento.</p></header>
    {!view.length ? <section className="empty"><Icon name="compare" size={32} /><h2>Aún no hay trabajos</h2><p>Crea un trabajo y publícalo para colocarlo en la web.</p><Link className="button primary" href="/app/new">Crear el primer trabajo</Link></section>
      : <PortadaScreen key={page} jobs={view} featured={featured} page={page} offset={(page - 1) * PORTADA_PAGE_SIZE} publishedTotal={publishedTotal} />}
    {(hasNext || page > 1) && <nav className="pager" aria-label="Páginas de trabajos">{page > 1 ? <Link className="button ghost" href={`/app/portada?page=${page - 1}`}><Icon name="left" />Anterior</Link> : <span />}<span className="pager-now">Página {page}</span>{hasNext ? <Link className="button ghost" href={`/app/portada?page=${page + 1}`}>Siguiente<Icon name="right" /></Link> : <span />}</nav>}
  </>;
}
