"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import { publicDate } from "./delivery";
import { PhotosIcon } from "./icons";
import { PublicPhoto } from "./photo";
import type { PublicTransformation } from "./transformation";
import { PublicViewer } from "./viewer";

// Antes y Después: la pareja elegida en /app → Portada, una tras otra a pantalla completa. Con movimiento, la sección
// se fija y el scroll la lleva en horizontal del Antes al Después (--x de HomeMotion); sin él, dos pantallas apiladas.
export function BeforeAfter({ transformation }: { transformation: PublicTransformation }) {
  const { job, before, after } = transformation;
  const [viewing, setViewing] = useState(false);
  const slides = [{ label: "Antes", photo: before }, { label: "Después", photo: after }];
  return <section className="pub-ba" aria-labelledby="ba-title">
    <h2 id="ba-title" className="pub-sr-only">Antes y después: {job.name}</h2>
    <div className="pub-ba-stage">
      <div className="pub-ba-track">
        {slides.map(({ label, photo }, index) => <figure key={label} className={`pub-ba-slide pub-ba-slide-${index}`} style={{ "--n": index } as CSSProperties}>
          <div className="pub-ba-img"><PublicPhoto jobId={job.id} mediaId={photo.id} alt={`${job.name}, ${label.toLowerCase()}`} sizes="100vw" preview focal={photo} maxWidth={640} wide={{ media: "(min-width: 1100px)", sizes: "100vw" }} /></div>
          <figcaption className="pub-ba-label">{label}</figcaption>
        </figure>)}
        <span className="pub-ba-chicane" aria-hidden="true" />
      </div>
      <div className="pub-ba-hud">
        <p className="pub-ba-job">{job.name} <time dateTime={job.job_date}>{publicDate(job.job_date)}</time></p>
        <p className="pub-ba-steps" aria-hidden="true"><span>Antes</span><span>Después</span></p>
        <button type="button" className="pub-more" onClick={() => setViewing(true)} aria-haspopup="dialog"><PhotosIcon />Ver fotos<span className="pub-sr-only"> de {job.name}</span></button>
      </div>
    </div>
    {viewing && <PublicViewer job={job} initialMediaId={after.id} onClose={() => setViewing(false)} />}
  </section>;
}
