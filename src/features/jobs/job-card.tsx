import Link from "next/link";
import { Icon } from "@/components/icon";
import { focalStyle } from "./focal";
import { displayDate } from "./format";
import { PrivatePhoto } from "./private-photo";

// Columnas del listado /app. La foto de la tarjeta se recorta con cover, por eso pide también su encuadre.
export const JOB_LIST_SELECT = "id,name,job_date,is_public,job_media(id,position,focal_x,focal_y)";
export type JobCardData = { id: string; name: string; job_date: string; is_public: boolean; job_media: { id: string; position: number; focal_x: number; focal_y: number }[] };

// Ancho pintado de la foto en la rejilla del listado (ver .job-grid en app.css: 2 → 3 → 4 → 5 columnas).
const CARD_SIZES = "(min-width: 1376px) 240px, (min-width: 1200px) calc((100vw - 176px) / 5), (min-width: 900px) calc((100vw - 124px) / 4), (min-width: 600px) calc((100vw - 64px) / 3), calc((100vw - 44px) / 2)";

// marks: con la transformación de la portada (solo informativo; se gestiona en la pantalla «Portada»).
export type JobMarks = { featured?: boolean };
export function JobCard({ job, marks }: { job: JobCardData; marks?: JobMarks }) {
  const first = [...job.job_media].sort((a, b) => a.position - b.position)[0];
  const photos = job.job_media.length;
  return <Link className={`job-card${job.is_public ? " is-public" : ""}`} href={`/app/jobs/${job.id}`}>
    <span className="card-text"><h2>{job.name}</h2><span className="card-meta"><time dateTime={job.job_date}>{displayDate(job.job_date)}</time>{photos > 0 && <span>{photos} {photos === 1 ? "foto" : "fotos"}</span>}</span></span>
    <span className="card-frame">
      {first ? <PrivatePhoto sizes={CARD_SIZES} src={`/app/api/photos/${first.id}`} width={400} height={500} alt="" className="card-image" style={focalStyle(first)} /> : <span className="card-placeholder"><Icon name="photo" size={28} /><span>Sin fotografías</span></span>}
      <span className="card-tags"><span className={`tag ${job.is_public ? "tag-live" : "tag-matte"}`}>{job.is_public ? "Publicado" : "Privado"}</span>{marks?.featured && <span className="tag tag-cover">Portada</span>}</span>
    </span>
  </Link>;
}
