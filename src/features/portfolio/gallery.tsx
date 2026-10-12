"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { PublicJob } from "./contract";
import { publicDate } from "./delivery";
import { mosaicColumns, mosaicRatio } from "./home-layout";
import { PhotosIcon } from "./icons";
import { PublicPhoto } from "./photo";
import { PublicViewer } from "./viewer";

const photoCount = (count: number) => `${count} ${count === 1 ? "fotografía" : "fotografías"}`;

// Un trabajo = una banda (nombre, fecha, número de fotos, descripción y «Ver fotos») y su mosaico en dos columnas
// escalonadas con proporciones alternas. Cada foto abre el visor en esa misma imagen. Con movimiento, HomeMotion
// destapa cada foto al subir (--t) y desplaza las columnas a distinta velocidad (--q del trabajo).
// Sin ninguna foto visible no hay banda: el contrato público ya no entrega esos trabajos; esto es solo defensa.
export function PublicGallery({ job }: { job: PublicJob }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  if (!job.media.length) return null;
  const columns = mosaicColumns(job.media);
  const sizes = columns.length > 1 ? "(min-width: 1100px) 26vw, 46vw" : "(min-width: 1100px) 40vw, 92vw";
  return <article className="pub-work" id={`trabajo-${job.id}`} aria-labelledby={`job-${job.id}`}>
    <header className="pub-band">
      <h3 id={`job-${job.id}`} className="pub-band-name">{job.name}</h3>
      <p className="pub-band-meta"><time dateTime={job.job_date}>{publicDate(job.job_date)}</time><span>{photoCount(job.media.length)}</span></p>
      {job.description && <p className="pub-band-desc">{job.description}</p>}
      <button type="button" className="pub-more" onClick={() => setSelectedPhoto(job.media[0].id)} aria-haspopup="dialog"><PhotosIcon />Ver fotos<span className="pub-sr-only"> de {job.name}</span></button>
    </header>
    <div className="pub-wall">{columns.map((column, columnIndex) => <div key={columnIndex} className="pub-col">
      {column.map(({ item: photo, index }) => <div key={photo.id} className="pub-tile" style={{ "--r": mosaicRatio(index) } as CSSProperties}>
        <PublicPhoto jobId={job.id} mediaId={photo.id} alt={`${job.name}, fotografía ${index + 1}`} sizes={sizes} preview focal={photo} maxWidth={640} onOpen={() => setSelectedPhoto(photo.id)} label={`Ampliar ${job.name}, fotografía ${index + 1}`} />
        {job.media.length > 1 && <span className="pub-tile-idx" aria-hidden="true">{index + 1}/{job.media.length}</span>}
      </div>)}
    </div>)}</div>
    {selectedPhoto && <PublicViewer job={job} initialMediaId={selectedPhoto} onClose={() => setSelectedPhoto(undefined)} />}
  </article>;
}
