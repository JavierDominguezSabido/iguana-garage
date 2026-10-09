import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { focalStyle } from "./focal";
import { displayDate } from "./format";

// Columnas del listado /app. La foto de la tarjeta se recorta con cover, por eso pide también su encuadre.
export const JOB_LIST_SELECT = "id,name,job_date,is_public,job_media(id,position,focal_x,focal_y)";
export type JobCardData = { id: string; name: string; job_date: string; is_public: boolean; job_media: { id: string; position: number; focal_x: number; focal_y: number }[] };

// marks: con la transformación de la portada (solo informativo; se gestiona en la pantalla «Portada»).
export type JobMarks = { featured?: boolean };
export function JobCard({ job, marks }: { job: JobCardData; marks?: JobMarks }) {
  const first = [...job.job_media].sort((a, b) => a.position - b.position)[0];
  return <Link className="job-card" href={`/app/jobs/${job.id}`}>{first ? <Image unoptimized src={`/app/api/photos/${first.id}`} width={640} height={440} alt={`Fotografía de ${job.name}`} className="card-image" style={focalStyle(first)} /> : <div className="card-placeholder"><Icon name="photo" /><span>Sin fotografías</span></div>}<div className="card-info"><h2>{job.name}</h2><div className="card-meta"><time dateTime={job.job_date}>{displayDate(job.job_date)}</time><span className={`badge ${job.is_public ? "published" : ""}`}>{job.is_public ? "Publicado" : "Privado"}</span>{marks?.featured && <span className="badge">Portada</span>}</div><span className="card-link">Ver trabajo <Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></span></div></Link>;
}
