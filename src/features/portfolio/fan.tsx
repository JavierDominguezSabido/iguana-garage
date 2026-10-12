import type { CSSProperties } from "react";
import type { PublicJob } from "./contract";
import { fanCards, fanSlot } from "./home-layout";
import { PublicPhoto } from "./photo";

// Portada: abanico de cartas (una por trabajo, como una carta de colores) que nace del borde inferior.
// Cada carta principal lleva a la banda de su trabajo; las repetidas solo completan el abanico.
// La apertura con el scroll la aplica HomeMotion (--p en la portada); sin ella queda entreabierto y quieto.
export function HeroFan({ jobs }: { jobs: readonly PublicJob[] }) {
  const cards = fanCards(jobs);
  if (!cards.length) return null;
  return <nav className="pub-fan" aria-label="Trabajos en portada">
    {cards.map((card, index) => <a key={card.photo.id} href={`#trabajo-${card.job.id}`} className="pub-card" style={{ "--k": fanSlot(index, cards.length), "--i": index } as CSSProperties}
      {...(card.primary ? {} : { "aria-hidden": true, tabIndex: -1 })}>
      <span className="pub-card-photo"><PublicPhoto jobId={card.job.id} mediaId={card.photo.id} alt="" sizes="(min-width: 1100px) 250px, (min-width: 700px) 28vw, 52vw" preview focal={card.photo} /></span>
      <span className="pub-card-label">{card.job.name}</span>
    </a>)}
  </nav>;
}
