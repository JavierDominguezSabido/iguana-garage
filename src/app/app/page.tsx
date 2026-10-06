import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { displayDate, privateContext } from "@/features/jobs/page-data";
export const metadata = { title: "Trabajos · Iguana Garage" };
export default async function JobsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, user } = await privateContext();
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1)); const offset = (Math.floor(page) - 1) * 30;
  const result = await supabase.from("jobs").select("id,name,job_date,is_public,job_media(id,position)", { count: "exact" }).eq("owner_id", user.id).order("job_date", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 29);
  if (result.error) throw new Error("No se pudieron cargar los trabajos");
  return <><div className="page-heading"><div><p className="eyebrow">TU TALLER</p><h1>Trabajos</h1><p className="muted">{result.count ? `${result.count} ${result.count === 1 ? "trabajo terminado" : "trabajos terminados"}` : "Cada reparación tiene su historia."}</p></div><Link href="/app/new" className="button primary"><Icon name="plus" />Nuevo trabajo</Link></div>
    {!result.data.length ? <section className="empty-state"><div className="empty-icon"><Icon name="photo" /></div><h2>{page > 1 ? "No hay más trabajos" : "Tu próximo trabajo empieza aquí"}</h2><p className="muted">{page > 1 ? "Vuelve a la primera página para ver tus trabajos." : "Guarda el vehículo, la fecha y las fotos de la reparación."}</p><Link className="button secondary" href={page > 1 ? "/app" : "/app/new"}>{page > 1 ? "Ver trabajos" : "Crear mi primer trabajo"}<Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></Link></section> : <div className="jobs-grid">{result.data.map((job) => {
      const first = [...job.job_media].sort((a, b) => a.position - b.position)[0];
      return <Link className="job-card" href={`/app/jobs/${job.id}`} key={job.id}>{first ? <Image unoptimized src={`/app/api/photos/${first.id}`} width={640} height={440} alt={`Fotografía de ${job.name}`} className="card-image" /> : <div className="card-placeholder"><Icon name="photo" /><span>Sin fotografías</span></div>}<div className="card-info"><h2>{job.name}</h2><div className="card-meta"><time dateTime={job.job_date}>{displayDate(job.job_date)}</time><span className={`badge ${job.is_public ? "published" : ""}`}>{job.is_public ? "Publicado" : "Privado"}</span></div><span className="card-link">Ver trabajo <Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></span></div></Link>;
    })}</div>}
    {(result.count ?? 0) > 30 && <nav className="pagination" aria-label="Páginas de trabajos">{page > 1 && <Link className="button secondary" href={`/app?page=${page - 1}`}>Anterior</Link>}<span>Página {page}</span>{offset + 30 < (result.count ?? 0) && <Link className="button secondary" href={`/app?page=${page + 1}`}>Siguiente</Link>}</nav>}
  </>;
}
