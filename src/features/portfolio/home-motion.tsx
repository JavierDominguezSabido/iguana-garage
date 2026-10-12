"use client";
import { useEffect, useSyncExternalStore } from "react";
import { crossing, pinnedProgress } from "./motion";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => { const query = matchMedia(REDUCED); query.addEventListener("change", onChange); return () => query.removeEventListener("change", onChange); };

// Movimiento de la home ligado al scroll. Solo con JavaScript y sin «reducir movimiento» marca la página:
//  - data-motion="scroll" si el navegador tiene scroll-driven animations: todo el movimiento lo hace el CSS y lo ejecuta el
//    compositor; aquí no se escucha nada.
//  - data-motion="js" si no: listener pasivo y una escritura por fotograma (requestAnimationFrame) de --p (portada) y --x
//    (Antes/Después). La geometría se mide al empezar y cuando cambia el tamaño del documento, nunca al desplazar.
export function HomeMotion() {
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(REDUCED).matches, () => true);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".portfolio-page");
    if (!root || reduced) return;
    if (CSS.supports("animation-timeline: view()")) {
      root.dataset.motion = "scroll";
      return () => { delete root.dataset.motion; };
    }
    root.dataset.motion = "js";
    type Section = { node: HTMLElement; name: string; map: (progress: number) => number; top: number; height: number; written: string };
    const sections: Section[] = [];
    const hero = root.querySelector<HTMLElement>(".pub-hero"), pair = root.querySelector<HTMLElement>(".pub-ba");
    if (hero) sections.push({ node: hero, name: "--p", map: (p) => p, top: 0, height: 0, written: "" });
    if (pair) sections.push({ node: pair, name: "--x", map: crossing, top: 0, height: 0, written: "" });
    let viewport = innerHeight, frame = 0;
    const tick = () => {
      frame = 0;
      const y = scrollY;
      for (const section of sections) {
        const text = section.map(pinnedProgress(section.top - y, section.height, viewport)).toFixed(3);
        if (text !== section.written) { section.written = text; section.node.style.setProperty(section.name, text); }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const measure = () => {
      const y = scrollY;
      viewport = innerHeight;
      for (const section of sections) { const box = section.node.getBoundingClientRect(); section.top = box.top + y; section.height = box.height; }
      schedule();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); removeEventListener("scroll", schedule);
      delete root.dataset.motion;
      for (const section of sections) section.node.style.removeProperty(section.name);
    };
  }, [reduced]);
  return null;
}
