import Link from "next/link";
import { Icon } from "@/components/icon";
import { JOB_LIST_SELECT, JobCard } from "@/features/jobs/job-card";
import { privateContext } from "@/features/jobs/page-data";
import { curationMarks } from "@/features/jobs/curation";
export const metadata = { title: "Trabajos · Iguana Garage" };
const JOBS_PAGE_SIZE = 30;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
export default async function JobsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, user } = await privateContext();
  const page = Math.floor(Math.max(1, Math.min(10000, Number((await searchParams).page) || 1))); const offset = (page - 1) * JOBS_PAGE_SIZE;
  const result = await supabase.from("jobs").select(JOB_LIST_SELECT, { count: "exact" }).eq("owner_id", user.id).order("job_date", { ascending: false }).order("id", { ascending: false }).range(offset, offset + JOBS_PAGE_SIZE - 1);
  if (result.error) throw new Error("No se pudieron cargar los trabajos");
  // Las marcas son informativas: si no se pueden leer, el listado sigue funcionando sin ellas.
  const { featuredJobId } = await curationMarks(supabase, user.id).catch(() => ({ featuredJobId: null }));
  const jobs = result.data; const count = result.count ?? 0;
  const pages = Math.ceil(count / JOBS_PAGE_SIZE);
  return <>
    <header className="page-head">
      <h1>Trabajos</h1>
      <p className="page-sub">{count ? `${plural(count, "reparación terminada", "reparaciones terminadas")}, de la más reciente a la más antigua.` : "Las reparaciones terminadas que guardes aparecerán aquí."}</p>
    </header>
    {!jobs.length
      ? <section className="empty"><Icon name="photo" size={32} /><h2>{page > 1 ? "Esta página está vacía" : "Aún no hay trabajos"}</h2><p>{page > 1 ? "Vuelve a la primera página para ver tus trabajos." : "Crea uno con el nombre, la fecha y las fotos de la reparación."}</p><Link className="button primary" href={page > 1 ? "/app" : "/app/new"}>{page > 1 ? "Ir a la primera página" : "Crear el primer trabajo"}</Link></section>
      : <ul className="job-grid">{jobs.map((job) => <li key={job.id}><JobCard job={job} marks={{ featured: job.id === featuredJobId }} /></li>)}</ul>}
    {pages > 1 && <nav className="pager" aria-label="Páginas de trabajos">{page > 1 ? <Link className="button ghost" href={`/app?page=${page - 1}`}><Icon name="left" />Anterior</Link> : <span />}<span className="pager-now">Página {page} de {pages}</span>{page < pages ? <Link className="button ghost" href={`/app?page=${page + 1}`}>Siguiente<Icon name="right" /></Link> : <span />}</nav>}
  </>;
}
