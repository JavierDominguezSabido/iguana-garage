"use client";
import Image from "next/image";
import { useState } from "react";
import type { PublicJob } from "./contract";
import { publicImageUrl } from "./image-loader";
import { PhotoViewer } from "@/features/viewer/photo-viewer";
import { viewerStageSizes } from "@/features/viewer/sizes";

// Resolución pedida a la foto del visor a pantalla completa (contain). Proporción desconocida → ancho real del marco.
export function viewerImageSizes(ratio?: number): string { return viewerStageSizes(ratio); }
function loadedPhotoRatio(jobId: string, mediaId: string): number | undefined {
  if (typeof document === "undefined") return;
  const path = `/api/portfolio/photos/${jobId}/${mediaId}`;
  for (const image of document.images) {
    if (image.naturalWidth && image.naturalHeight && new URL(image.currentSrc || image.src, document.baseURI).pathname === path) return image.naturalWidth / image.naturalHeight;
  }
}

// Un mismo visor para los accesos desde el muro y desde el comparador. Piel `pub-viewer` (portfolio.css):
// Barlow y tokens públicos. Comportamiento (tira con la foto actual y sus vecinas, deslizar, teclado) compartido
// con el visor privado en @/features/viewer.
export function PublicViewer({ job, initialMediaId, onClose }: { job: PublicJob; initialMediaId: string; onClose: () => void }) {
  const [active, setActive] = useState(() => job.media.findIndex(item => item.id === initialMediaId));
  // La proporción de cada foto se fija al abrir (a partir de las ya cargadas en el muro): así el `sizes` de una foto es el
  // mismo cuando se precarga como vecina y cuando se muestra, y el navegador no descarga otra variante.
  const [ratios] = useState(() => job.media.map((item) => loadedPhotoRatio(job.id, item.id)));
  return <PhotoViewer skin="pub-viewer" label={`Fotografías de ${job.name}`} title={job.name} index={active} count={job.media.length} onIndexChange={setActive} onClose={onClose}
    renderPhoto={(index, { retry, onLoad, onError }) => { const item = job.media[index]; return <Image fill src={`/api/portfolio/photos/${job.id}/${item.id}`} loader={({ width }) => publicImageUrl(job.id, item.id, width, retry)} sizes={viewerImageSizes(ratios[index])} alt={`${job.name}, fotografía ${index + 1}`} className="pub-photo-contain" loading="eager" onLoad={onLoad} onError={onError} />; }}
    renderThumb={(index) => { const item = job.media[index]; return <Image fill src={`/api/portfolio/photos/${job.id}/${item.id}`} loader={({ width }) => publicImageUrl(job.id, item.id, width)} sizes="64px" alt="" style={{ objectPosition: `${item.focal_x}% ${item.focal_y}%` }} />; }} />;
}
