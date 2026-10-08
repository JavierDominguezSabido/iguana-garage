"use client";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { PublicTransformation } from "./transformation";
import { PublicPhoto } from "./photo";
import { PublicViewer } from "./viewer";
import { COMPARE_MAX, COMPARE_MIN, COMPARE_START, clampCompare, compareAt, compareDrag, compareFromKey, compareValueText, hintOffset } from "./compare";

const HINT_DELAY_MS = 700;
const HINT_DURATION_MS = 1400;
const SIZES = "(min-width: 900px) 46vw, 100vw";

// La posición se pinta sobre el DOM (variable CSS + ARIA) para que arrastrar no vuelva a renderizar las fotos.
function paint(element: HTMLElement, value: number) {
  element.style.setProperty("--p", `${value}%`);
  element.setAttribute("aria-valuenow", String(Math.round(value)));
  element.setAttribute("aria-valuetext", compareValueText(value));
}

// Comparador Antes/Después: solo se arrastra (ratón, táctil o teclado). Las fotos se amplían con «Ver fotos».
export function FeaturedTransformation({ transformation }: { transformation: PublicTransformation }) {
  const { job, before, after } = transformation;
  const [viewing, setViewing] = useState(false);
  const slider = useRef<HTMLDivElement>(null);
  const value = useRef(COMPARE_START);
  const touched = useRef(false);
  const drag = useRef<{ pointer: number; startX: number; startValue: number; mouse: boolean } | null>(null);

  // Pista de uso: al entrar en pantalla la barra se mueve sola un poco y vuelve, una única vez.
  useEffect(() => {
    const element = slider.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, timer = 0, started = false;
    const run = () => {
      const origin = performance.now();
      const step = (now: number) => {
        if (touched.current) return;
        const progress = (now - origin) / HINT_DURATION_MS;
        value.current = progress < 1 ? clampCompare(COMPARE_START + hintOffset(progress)) : COMPARE_START;
        paint(element, value.current);
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver((entries) => {
      if (started || !entries.some((entry) => entry.isIntersecting)) return;
      started = true; observer.disconnect(); timer = window.setTimeout(run, HINT_DELAY_MS);
    }, { threshold: 0.6 });
    observer.observe(element);
    return () => { observer.disconnect(); window.clearTimeout(timer); cancelAnimationFrame(frame); };
  }, []);

  function move(next: number) {
    if (!slider.current) return;
    value.current = next; paint(slider.current, next);
  }
  function begin(event: PointerEvent<HTMLDivElement>) {
    const mouse = event.pointerType === "mouse";
    if (mouse && event.button !== 0) return;
    touched.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    // Ratón: la barra salta al puntero. Táctil: arrastre relativo; el navegador reclama el gesto vertical (pan-y).
    if (mouse) { const box = event.currentTarget.getBoundingClientRect(); move(compareAt(event.clientX, box.left, box.width)); }
    drag.current = { pointer: event.pointerId, startX: event.clientX, startValue: value.current, mouse };
  }
  function follow(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    move(current.mouse ? compareAt(event.clientX, box.left, box.width) : compareDrag(current.startValue, current.startX, event.clientX, box.width));
  }
  function end(event: PointerEvent<HTMLDivElement>) { if (drag.current?.pointer === event.pointerId) drag.current = null; }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const next = compareFromKey(value.current, event.key, event.shiftKey);
    if (next === undefined) return;
    event.preventDefault(); touched.current = true; move(next);
  }

  return <div className="pub-compare-block">
    <p className="pub-compare-tag">{job.name}</p>
    <div ref={slider} className="pub-compare" role="slider" tabIndex={0} aria-label={`Comparador Antes y Después: ${job.name}`} aria-orientation="horizontal" aria-valuemin={COMPARE_MIN} aria-valuemax={COMPARE_MAX} aria-valuenow={COMPARE_START} aria-valuetext={compareValueText(COMPARE_START)}
      onPointerDown={begin} onPointerMove={follow} onPointerUp={end} onPointerCancel={end} onKeyDown={key}>
      <PublicPhoto jobId={job.id} mediaId={after.id} alt={`${job.name}, después`} sizes={SIZES} preload preview focal={after} />
      <div className="pub-compare-before"><PublicPhoto jobId={job.id} mediaId={before.id} alt={`${job.name}, antes`} sizes={SIZES} preload preview focal={before} /></div>
      <span className="pub-compare-chip pub-compare-chip-before" aria-hidden="true">Antes</span>
      <span className="pub-compare-chip pub-compare-chip-after" aria-hidden="true">Después</span>
      <div className="pub-compare-bar" aria-hidden="true"><span className="pub-compare-knob"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg></span></div>
    </div>
    <button type="button" className="pub-compare-open" onClick={() => setViewing(true)} aria-haspopup="dialog">Ver fotos <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2" /><path d="M7 3h12a2 2 0 0 1 2 2v12" /></svg><span className="pub-sr-only"> de {job.name}</span></button>
    {viewing && <PublicViewer job={job} initialMediaId={after.id} onClose={() => setViewing(false)} />}
  </div>;
}
