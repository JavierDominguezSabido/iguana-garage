import Link from "next/link";
import { Icon } from "@/components/icon";
import { displayDate, privateJob } from "@/features/jobs/page-data";
import { Gallery } from "@/features/jobs/gallery";
import { DeleteButton } from "@/features/jobs/delete-button";
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { job, media } = await privateJob((await params).id);
  return <><Link className="back-link" href="/app"><Icon name="arrow" />Trabajos</Link><div className="page-heading detail-heading"><div><p className="eyebrow">TRABAJO TERMINADO</p><h1>{job.name}</h1><div className="detail-meta"><time dateTime={job.job_date}>{displayDate(job.job_date)}</time><span className={`badge ${job.is_public ? "published" : ""}`}>{job.is_public ? "Publicado" : "Privado"}</span></div></div><Link href={`/app/jobs/${job.id}/edit`} className="button primary">Editar trabajo</Link></div><div className="detail-grid"><Gallery media={media} name={job.name} /><aside className="job-information"><h2>Datos del trabajo</h2><dl><div><dt>Fecha</dt><dd>{displayDate(job.job_date)}</dd></div>{job.paint_code && <div><dt>Código de pintura</dt><dd>{job.paint_code}</dd></div>}<div><dt>Fotografías</dt><dd>{media.length}</dd></div><div><dt>Portfolio</dt><dd>{job.is_public ? "Publicado" : "Privado"}</dd></div></dl><p className="field-help">{job.is_public ? "Las fotografías están disponibles en el portfolio. El código de pintura permanece privado." : "Este trabajo solo está visible en tu área privada."}</p><DeleteButton id={job.id} name={job.name} /></aside></div></>;
}
