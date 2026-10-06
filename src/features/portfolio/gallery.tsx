"use client";
import { useState } from "react";
import type { PublicJob } from "./contract";
import { PublicPhoto } from "./photo";
import { PublicViewer } from "./viewer";

export function PublicGallery({ job, sizes, preload = false }: { job: PublicJob; sizes: string; preload?: boolean }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  if (!job.media.length) return <><div className="pub-work-photo pub-no-photo"><span>Fotografías próximamente</span></div><div className="pub-work-caption"><h3 id={`job-${job.id}`}>{job.name}</h3></div></>;
  // Regla de presentación común: última foto publicada, sin atribuirle un estado.
  const previewIndex = job.media.length - 1;
  const preview = job.media[previewIndex];
  return <>
    <div className="pub-work-photo"><PublicPhoto jobId={job.id} mediaId={preview.id} alt={`${job.name}, fotografía ${previewIndex + 1}`} sizes={sizes} preload={preload} preview onOpen={() => setSelectedPhoto(preview.id)} label={`Ver galería de ${job.name}`} /></div>
    <div className="pub-work-caption"><h3 id={`job-${job.id}`}>{job.name}</h3><button type="button" className="pub-gallery-open" onClick={() => setSelectedPhoto(preview.id)} aria-haspopup="dialog"><span className="pub-work-count">{job.media.length} {job.media.length === 1 ? "fotografía" : "fotografías"}</span><span>Ver galería<span className="pub-sr-only"> de {job.name}</span> <span aria-hidden="true">↗</span></span></button></div>
    {selectedPhoto && <PublicViewer job={job} initialMediaId={selectedPhoto} onClose={() => setSelectedPhoto(undefined)} />}
  </>;
}
