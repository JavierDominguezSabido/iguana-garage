"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { PublicJob } from "./contract";
import { PublicPhoto } from "./photo";
import { publicPhotoUrl } from "./delivery";

export function PublicGallery({ job, sizes }: { job: PublicJob; sizes: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  if (!job.media.length) return <div className="pub-no-photo"><span>Fotografías próximamente</span></div>;
  const photo = job.media[active];
  function change(delta: number) { setActive((value) => (value + delta + job.media.length) % job.media.length); }
  return <>
    <PublicPhoto jobId={job.id} mediaId={job.media[0].id} alt={`${job.name}, fotografía 1`} sizes={sizes} preview onOpen={() => { setOpen(true); setActive(0); dialog.current?.showModal(); }} label={`Ver fotos de ${job.name}`} />
    <dialog ref={dialog} className="pub-dialog" aria-label={`Fotografías de ${job.name}`} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={(event) => { if (event.key === "ArrowRight") change(1); if (event.key === "ArrowLeft") change(-1); }}>
      <div className="pub-dialog-head"><div><p>{job.name}</p><span aria-live="polite">Fotografía {active + 1} de {job.media.length}</span></div><button type="button" className="pub-close" aria-label="Cerrar fotografías" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="pub-full-photo">{open && <PublicPhoto key={photo.id} jobId={job.id} mediaId={photo.id} alt={`${job.name}, fotografía ${active + 1}`} sizes="(max-width: 768px) 94vw, (max-width: 1200px) 90vw, 1080px" />}</div>
      {open && job.media.length > 1 && <><div className="pub-gallery-controls"><button type="button" onClick={() => change(-1)}>← Anterior</button><button type="button" onClick={() => change(1)}>Siguiente →</button></div><div className="pub-thumbnails" aria-label="Seleccionar fotografía">{job.media.map((item, index) => <button type="button" key={item.id} aria-label={`Ver fotografía ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)}><Image fill src={`/api/portfolio/photos/${job.id}/${item.id}`} loader={({ width }) => publicPhotoUrl(job.id, item.id, width)} sizes="64px" alt="" /></button>)}</div></>}
    </dialog>
  </>;
}
