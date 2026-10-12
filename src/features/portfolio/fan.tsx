"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { PublicJob } from "./contract";
import { fanCards, fanSlot } from "./home-layout";
import { PublicPhoto } from "./photo";

const NARROW = "(max-width: 1099px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const arrow = (d: string) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

// Portada: abanico de cartas (una por trabajo, como una carta de colores). Cada carta principal lleva a la banda de su
// trabajo; las repetidas solo completan el abanico. En escritorio se abre con el scroll (CSS). En móvil y tablet es un
// carrusel nativo con scroll-snap (el enlace es la caja de encaje, sin transformar; la inclinación va en .pub-card-body
// para no mover los puntos de encaje). La posición sale de un IntersectionObserver (sin leer layout al desplazar): marca
// cada carta como centrada o a un lado (data-pos) y el CSS inclina las vecinas con una transición. Los botones y las flechas
// del teclado pasan de carta en carta.
export function HeroFan({ jobs }: { jobs: readonly PublicJob[] }) {
  const cards = fanCards(jobs);
  const track = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const narrow = matchMedia(NARROW);
    let observer: IntersectionObserver | undefined;
    const start = () => {
      observer?.disconnect(); observer = undefined;
      if (!narrow.matches) return;
      const items = [...element.querySelectorAll<HTMLElement>(".pub-card")];
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) if (entry.intersectionRatio >= 0.85) setCurrent(items.indexOf(entry.target as HTMLElement));
      }, { root: element, threshold: 0.85 }); // solo la centrada; las vecinas asoman menos
      for (const item of items) observer.observe(item);
    };
    start();
    narrow.addEventListener("change", start);
    return () => { observer?.disconnect(); narrow.removeEventListener("change", start); };
  }, [cards.length]);
  if (!cards.length) return null;
  const go = (index: number) => {
    const element = track.current, card = element?.querySelectorAll<HTMLElement>(".pub-card")[index];
    if (!element || !card) return;
    element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2, behavior: matchMedia(REDUCED).matches ? "auto" : "smooth" });
  };
  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (!matchMedia(NARROW).matches || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    go(Math.min(cards.length - 1, Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1))));
  };
  return <div className="pub-fan-wrap">
    <nav ref={track} className="pub-fan" aria-label="Trabajos en portada" onKeyDown={keys}>
      {cards.map((card, index) => <a key={card.photo.id} href={`#trabajo-${card.job.id}`} className="pub-card" data-pos={index < current ? "l" : index > current ? "r" : "c"} style={{ "--k": fanSlot(index, cards.length), "--i": index } as CSSProperties}
        {...(card.primary ? {} : { "aria-hidden": true, tabIndex: -1 })}>
        <span className="pub-card-body"><span className="pub-card-photo"><PublicPhoto jobId={card.job.id} mediaId={card.photo.id} alt="" sizes="(min-width: 1100px) 250px, (min-width: 700px) 44vw, 64vw" preview focal={card.photo} maxWidth={640} /></span>
        <span className="pub-card-label">{card.job.name}</span></span>
      </a>)}
    </nav>
    <div className="pub-fan-ctrl">
      <button type="button" className="pub-fan-step" aria-label="Carta anterior" disabled={current === 0} onClick={() => go(current - 1)}>{arrow("M15 5l-7 7 7 7")}</button>
      <p className="pub-fan-count" aria-live="polite"><span className="pub-sr-only">Carta </span><b>{current + 1}</b><span aria-hidden="true"> / </span><span className="pub-sr-only"> de </span>{cards.length}</p>
      <button type="button" className="pub-fan-step" aria-label="Carta siguiente" disabled={current === cards.length - 1} onClick={() => go(current + 1)}>{arrow("M9 5l7 7-7 7")}</button>
    </div>
  </div>;
}
