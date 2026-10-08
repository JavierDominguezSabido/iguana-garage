"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { PublicJob } from "./contract";
import { publicDate } from "./delivery";
import { PublicPhoto } from "./photo";
import { PublicViewer } from "./viewer";
import { wallLayout } from "./wall";

const photoCount = (count: number) => `${count} ${count === 1 ? "fotografía" : "fotografías"}`;
// Ancho pintado por foto: 2 columnas en móvil/tablet (la primera, a todo el ancho si es impar) y 12 columnas desde 900 px.
const tileSizes = (span: number, wide: boolean) => `(min-width: 900px) ${(span / 12 * 100).toFixed(2)}vw, ${wide ? "100vw" : "50vw"}`;

// Un trabajo = una banda con nombre y fecha + su muro de fotos. Cada foto abre el visor en esa misma imagen.
export function PublicGallery({ job }: { job: PublicJob }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  const layout = wallLayout(job.media.length);
  return <article className="pub-work" aria-labelledby={`job-${job.id}`}>
    <header className="pub-band" data-reveal>
      <h3 id={`job-${job.id}`}>{job.name}</h3>
      <p className="pub-band-meta"><time dateTime={job.job_date}>{publicDate(job.job_date)}</time>{job.media.length > 0 && <> · {photoCount(job.media.length)}</>}</p>
      {job.description && <p className="pub-band-desc">{job.description}</p>}
    </header>
    {job.media.length === 0 ? <div className="pub-no-photo" data-reveal><span>Fotografías próximamente</span></div>
      : <div className="pub-wall">{job.media.map((photo, index) => {
        const { span, wide } = layout[index];
        // data-paint: al entrar en pantalla una franja verde recorre la foto y la descubre (ver RevealOnScroll y portfolio.css).
        return <div key={photo.id} className={`pub-tile${wide ? " pub-tile-wide" : ""}`} style={{ "--s": span, "--rv": index % 4 } as CSSProperties} data-paint>
          <div className="pub-paint"><div className="pub-paint-photo">
            <PublicPhoto jobId={job.id} mediaId={photo.id} alt={`${job.name}, fotografía ${index + 1}`} sizes={tileSizes(span, wide)} preview focal={photo} onOpen={() => setSelectedPhoto(photo.id)} label={`Ampliar ${job.name}, fotografía ${index + 1}`} />
            {job.media.length > 1 && <span className="pub-tile-idx" aria-hidden="true">{index + 1}/{job.media.length}</span>}
          </div></div>
          <span className="pub-paint-stripe" aria-hidden="true" />
        </div>;
      })}</div>}
    {selectedPhoto && <PublicViewer job={job} initialMediaId={selectedPhoto} onClose={() => setSelectedPhoto(undefined)} />}
  </article>;
}
