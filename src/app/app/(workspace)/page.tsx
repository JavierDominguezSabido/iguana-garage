import Link from "next/link";
import { Icon } from "@/components/icon";
import { JOB_LIST_SELECT, JobCard } from "@/features/jobs/job-card";
import { privateContext } from "@/features/jobs/page-data";
import { curationMarks } from "@/features/jobs/curation";
export const metadata = { title: "Trabajos · Iguana Garage" };
export default async function JobsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, user } = await privateContext();
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1)); const offset = (Math.floor(page) - 1) * 30;
  const result = await supabase.from("jobs").select(JOB_LIST_SELECT, { count: "exact" }).eq("owner_id", user.id).order("job_date", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 29);
  if (result.error) throw new Error("No se pudieron cargar los trabajos");
  // Las marcas son informativas: si no se pueden leer, el listado sigue funcionando sin ellas.
  const marks = await curationMarks(supabase, user.id).catch(() => ({ pinnedJobId: null, featuredJobId: null }));
  return <><div className="page-heading"><div><p className="eyebrow">TU TALLER</p><h1>Trabajos</h1><p className="muted">{result.count ? `${result.count} ${result.count === 1 ? "trabajo terminado" : "trabajos terminados"}` : "Cada reparación tiene su historia."}</p></div><Link href="/app/new" className="button primary"><Icon name="plus" />Nuevo trabajo</Link></div>
    {!result.data.length ? <section className="empty-state"><div className="empty-icon"><Icon name="photo" /></div><h2>{page > 1 ? "No hay más trabajos" : "Tu próximo trabajo empieza aquí"}</h2><p className="muted">{page > 1 ? "Vuelve a la primera página para ver tus trabajos." : "Guarda el vehículo, la fecha y las fotos de la reparación."}</p><Link className="button secondary" href={page > 1 ? "/app" : "/app/new"}>{page > 1 ? "Ver trabajos" : "Crear mi primer trabajo"}<Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></Link></section> : <div className="jobs-grid">{result.data.map((job) => <JobCard key={job.id} job={job} marks={{ pinned: job.id === marks.pinnedJobId, featured: job.id === marks.featuredJobId }} />)}</div>}
    {(result.count ?? 0) > 30 && <nav className="pagination" aria-label="Páginas de trabajos">{page > 1 && <Link className="button secondary" href={`/app?page=${page - 1}`}>Anterior</Link>}<span>Página {page}</span>{offset + 30 < (result.count ?? 0) && <Link className="button secondary" href={`/app?page=${page + 1}`}>Siguiente</Link>}</nav>}
  </>;
}
