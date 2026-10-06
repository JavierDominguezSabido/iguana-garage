"use client";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import type { PublicJob } from "./contract";
import { PublicPhoto } from "./photo";
import { publicImageUrl } from "./image-loader";

// Un mismo visor para los accesos desde la grid y desde la comparación curada.
export function PublicViewer({ job, initialMediaId, onClose }: { job: PublicJob; initialMediaId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(() => job.media.findIndex(item => item.id === initialMediaId));
  const photo = job.media[active];
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function change(delta: number) { setActive(value => (value + delta + job.media.length) % job.media.length); }
  // Un cierre de cleanup puede llegar después de la reapertura de Strict Mode.
  return <dialog ref={dialog} className="pub-dialog" aria-label={`Fotografías de ${job.name}`} onClose={event => { if (!event.currentTarget.open) onClose(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === "ArrowRight") change(1); if (event.key === "ArrowLeft") change(-1); }}>
      <div className="pub-dialog-head"><div><p>{job.name}</p><span aria-live="polite">Fotografía {active + 1} de {job.media.length}</span></div><button type="button" className="pub-close" aria-label="Cerrar fotografías" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="pub-full-photo">{photo && <PublicPhoto key={photo.id} jobId={job.id} mediaId={photo.id} alt={`${job.name}, fotografía ${active + 1}`} sizes="(max-width: 768px) 94vw, (max-width: 1200px) 90vw, 1080px" />}</div>
      {job.media.length > 1 && <><div className="pub-gallery-controls"><button type="button" onClick={() => change(-1)}>← Anterior</button><button type="button" onClick={() => change(1)}>Siguiente →</button></div><div className="pub-thumbnails" aria-label="Seleccionar fotografía">{job.media.map((item, index) => <button type="button" key={item.id} aria-label={`Ver fotografía ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)}><Image fill src={`/api/portfolio/photos/${job.id}/${item.id}`} loader={({ width }) => publicImageUrl(job.id, item.id, width)} sizes="64px" alt="" /></button>)}</div></>}
    </dialog>;
}
