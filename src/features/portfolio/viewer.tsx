"use client";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { PublicJob } from "./contract";
import { PublicPhoto } from "./photo";
import { publicImageUrl } from "./image-loader";
import { swipeDirection } from "./swipe";

export function viewerImageSizes(ratio?: number): string {
  const frame = "min(calc(100vw - 50px), 1110px";
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return `${frame})`;
  const rounded = (value: number) => Number(value.toFixed(4));
  // object-fit: contain pinta como máximo height * ratio, dentro del mismo marco.
  return `${frame}, ${rounded(60 * ratio)}dvh, ${rounded(720 * ratio)}px)`;
}
function loadedPhotoRatio(jobId: string, mediaId: string): number | undefined {
  if (typeof document === "undefined") return;
  const path = `/api/portfolio/photos/${jobId}/${mediaId}`;
  for (const image of document.images) {
    if (image.naturalWidth && image.naturalHeight && new URL(image.currentSrc || image.src, document.baseURI).pathname === path) return image.naturalWidth / image.naturalHeight;
  }
}

// Un mismo visor para los accesos desde la grid y desde la comparación curada.
export function PublicViewer({ job, initialMediaId, onClose }: { job: PublicJob; initialMediaId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(() => job.media.findIndex(item => item.id === initialMediaId));
  const photo = job.media[active];
  const [ratio, setRatio] = useState(() => loadedPhotoRatio(job.id, initialMediaId));
  const swipe = useRef<{ pointer: number; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function select(index: number) { setRatio(loadedPhotoRatio(job.id, job.media[index].id)); setActive(index); }
  function change(delta: number) { select((active + delta + job.media.length) % job.media.length); }
  // Deslizar con el dedo cambia de foto (además de botones y teclado). El ratón no desliza: touch-action: pan-y deja pasar el scroll vertical.
  function swipeStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || job.media.length < 2) return;
    swipe.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
  }
  function swipeEnd(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current; swipe.current = null;
    if (!start || start.pointer !== event.pointerId) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (direction) change(direction);
  }
  // Un cierre de cleanup puede llegar después de la reapertura de Strict Mode.
  return <dialog ref={dialog} className="pub-dialog" aria-label={`Fotografías de ${job.name}`} onClose={event => { if (!event.currentTarget.open) onClose(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === "ArrowRight") change(1); if (event.key === "ArrowLeft") change(-1); }}>
      <div className="pub-dialog-head"><div><p>{job.name}</p><span aria-live="polite">Fotografía {active + 1} de {job.media.length}</span></div><button type="button" className="pub-close" aria-label="Cerrar fotografías" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="pub-full-photo" onPointerDown={swipeStart} onPointerUp={swipeEnd} onPointerCancel={() => { swipe.current = null; }}>{photo && <PublicPhoto key={photo.id} jobId={job.id} mediaId={photo.id} alt={`${job.name}, fotografía ${active + 1}`} sizes={viewerImageSizes(ratio)} />}</div>
      {job.media.length > 1 && <><div className="pub-gallery-controls"><button type="button" onClick={() => change(-1)}>← Anterior</button><button type="button" onClick={() => change(1)}>Siguiente →</button></div><div className="pub-thumbnails" aria-label="Seleccionar fotografía">{job.media.map((item, index) => <button type="button" key={item.id} aria-label={`Ver fotografía ${index + 1}`} aria-pressed={index === active} onClick={() => select(index)}><Image fill src={`/api/portfolio/photos/${job.id}/${item.id}`} loader={({ width }) => publicImageUrl(job.id, item.id, width)} sizes="60px" alt="" style={{ objectPosition: `${item.focal_x}% ${item.focal_y}%` }} /></button>)}</div></>}
    </dialog>;
}
