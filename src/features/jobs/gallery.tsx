"use client";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { Media } from "./data";
import { focalStyle } from "./focal";
import {privateImageLoader,privateViewerLoader,mainImageSizes,privateViewerSizes} from "./image-loader";
import { PhotoViewer } from "@/features/viewer/photo-viewer";
// Visor a pantalla completa con piel `app-viewer` (globals.css, tipografía y tokens del área privada). El
// comportamiento (tira con la foto actual y sus vecinas, teclado, deslizar, foco, miniaturas) es el mismo componente
// base que usa el visor público.
export function Gallery({ media, name }: { media: Media[]; name: string }) {
  const [active, setActive] = useState(0); const [viewing, setViewing] = useState(false);
  if (!media.length) return <div className="gallery-empty"><Icon name="photo" /><p>Este trabajo todavía no tiene fotografías.</p></div>;
  const photo = media[active];
  return <section className="gallery" aria-label="Fotografías del trabajo"><button className="gallery-main" onClick={() => setViewing(true)} aria-haspopup="dialog" aria-label={`${active + 1} / ${media.length} · Ampliar fotografía`}><Image loader={privateImageLoader} sizes={mainImageSizes(photo.width,photo.height)} src={`/app/api/photos/${photo.id}`} width={photo.width ?? 1080} height={photo.height ?? 1350} alt={`${name}, fotografía ${active + 1}`} priority /><span className="gallery-count">{active + 1} / {media.length} · Ampliar</span></button><div className="gallery-thumbs">{media.map((item, index) => <button key={item.id} className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Ver fotografía ${index + 1}`} aria-pressed={index === active}><Image loader={privateImageLoader} sizes="70px" src={`/app/api/photos/${item.id}`} width={120} height={120} alt="" style={focalStyle(item)} /></button>)}</div>
    {viewing && <PhotoViewer skin="app-viewer" label={`Fotografías de ${name}`} title={name} index={active} count={media.length} onIndexChange={setActive} onClose={() => setViewing(false)}
      renderPhoto={(index, { onLoad, onError }) => { const item = media[index]; return <Image fill loader={privateViewerLoader} sizes={privateViewerSizes(item.width,item.height)} src={`/app/api/photos/${item.id}`} alt={`${name}, fotografía ${index + 1}`} loading="eager" onLoad={onLoad} onError={onError} />; }}
      renderThumb={(index) => <Image fill loader={privateImageLoader} sizes="64px" src={`/app/api/photos/${media[index].id}`} alt="" style={focalStyle(media[index])} />} />}
  </section>;
}
