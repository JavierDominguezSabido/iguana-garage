"use client";
import { useState } from "react";
import type { PublicTransformation } from "./transformation";
import { PublicPhoto } from "./photo";
import { PublicViewer } from "./viewer";

export function FeaturedTransformation({ transformation }: { transformation: PublicTransformation }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  const { job, before, after } = transformation;
  const sizes = "(max-width: 699px) calc((100vw - 52px) / 2), (max-width: 1199px) calc((100vw - 88px) / 2), 606px";
  return <section className="pub-shell pub-transformation" aria-labelledby="transformation-title">
    <div className="pub-transform-heading"><h2 id="transformation-title">Transformación</h2><p>{job.name}</p></div>
    <div className="pub-transform-pair">
      <figure><figcaption><strong>Antes</strong><span>Preparación</span></figcaption><div className="pub-transform-photo"><PublicPhoto jobId={job.id} mediaId={before.id} alt={`${job.name}, capó y frontal en preparación`} sizes={sizes} preload preview onOpen={() => setSelectedPhoto(before.id)} label={`Ampliar Antes: ${job.name}`} /></div></figure>
      <figure><figcaption><strong>Después</strong><span>Acabado de pintura</span></figcaption><div className="pub-transform-photo"><PublicPhoto jobId={job.id} mediaId={after.id} alt={`${job.name}, acabado de pintura negra en capó y frontal, antes del montaje de la parrilla`} sizes={sizes} preload preview onOpen={() => setSelectedPhoto(after.id)} label={`Ampliar Después: ${job.name}`} /></div></figure>
    </div>
    {selectedPhoto && <PublicViewer job={job} initialMediaId={selectedPhoto} onClose={() => setSelectedPhoto(undefined)} />}
  </section>;
}
