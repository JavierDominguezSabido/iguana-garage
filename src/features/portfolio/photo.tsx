"use client";
import Image from "next/image";
import { useState } from "react";
import { publicImageUrl } from "./image-loader";

export function PublicPhoto({ jobId, mediaId, alt, sizes, preload = false, preview = false, onOpen, label }: {
  jobId: string; mediaId: string; alt: string; sizes: string; preload?: boolean; preview?: boolean; onOpen?: () => void; label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const image = <Image key={retry} src={`/api/portfolio/photos/${jobId}/${mediaId}`} loader={({ width }) => publicImageUrl(jobId, mediaId, width, retry)} fill sizes={sizes} alt={alt} preload={preload} className={preview ? "pub-photo-cover" : "pub-photo-contain"} onError={() => setFailed(true)} />;
  return <div className="pub-photo">
    {failed ? <div className="pub-photo-failed"><p>Fotografía no disponible.</p>{retry < 3 && <button type="button" className="pub-text-action" onClick={() => { setRetry(retry + 1); setFailed(false); }}>Reintentar foto</button>}</div>
      : onOpen ? <button type="button" className="pub-photo-trigger" onClick={onOpen} aria-label={label} aria-haspopup="dialog">{image}</button> : image}
  </div>;
}
