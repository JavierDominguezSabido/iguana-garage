import Link from "next/link";
import { Icon } from "@/components/icon";
import { displayDate, privateJobDetail } from "@/features/jobs/page-data";
import { Gallery } from "@/features/jobs/gallery";
import { DeleteButton } from "@/features/jobs/delete-button";
import { curationStatus } from "@/features/jobs/curation-status";
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { job, media, curation } = await privateJobDetail((await params).id);
  return <>
    <Link className="back-link" href="/app"><Icon name="back" size={20} />Todos los trabajos</Link>
    <div className="detail">
      <header className="detail-head">
        <span className={`tag ${job.is_public ? "tag-live" : "tag-matte"}`}>{job.is_public ? "Publicado" : "Privado"}</span>
        <h1>{job.name}</h1>
        <p className="detail-date"><time dateTime={job.job_date}>{displayDate(job.job_date)}</time></p>
      </header>
      <div className="detail-media"><Gallery media={media} name={job.name} /></div>
      <aside className="sheet" aria-label="Datos del trabajo">
        {job.paint_code && <div className="paint-code"><span>Código de pintura</span><strong>{job.paint_code}</strong></div>}
        <dl className="facts">
          {job.work_hours != null && <div><dt>Horas de trabajo</dt><dd>{String(job.work_hours).replace(".", ",")} h</dd></div>}
          <div><dt>Fotografías</dt><dd>{media.length}</dd></div>
          <div><dt>En la web</dt><dd>{job.is_public ? "Publicado" : "Privado"}</dd></div>
          {job.description && <div className="fact-wide"><dt>Descripción</dt><dd className="job-description">{job.description}</dd></div>}
        </dl>
        <p className="sheet-note">{job.is_public ? "Las fotos y la descripción se ven en la web. El código de pintura y las horas solo los ves tú." : "Solo lo ves tú: no aparece en la web."}</p>
        <div className="sheet-actions"><Link href={`/app/jobs/${job.id}/edit`} className="button primary"><Icon name="pencil" />Editar trabajo</Link><DeleteButton id={job.id} name={job.name} /></div>
        <section className="cover-line" aria-labelledby="cover-line-title">
          <h2 id="cover-line-title">Portada</h2>
          <p>{curationStatus({ isPublic: job.is_public, inCover: curation.inCover, hidden: media.filter((photo) => photo.hidden_from_home).length })}</p>
          <Link className="button ghost" href="/app/portada"><Icon name="compare" />Gestionar en Portada</Link>
        </section>
      </aside>
    </div>
  </>;
}
