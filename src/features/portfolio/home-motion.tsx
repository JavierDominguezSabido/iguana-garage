"use client";
import { useEffect, useSyncExternalStore } from "react";
import { crossing, follow, passProgress, pinnedProgress, revealProgress } from "./motion";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => { const query = matchMedia(REDUCED); query.addEventListener("change", onChange); return () => query.removeEventListener("change", onChange); };

// Movimiento de la home ligado al scroll. Solo con JavaScript y sin «reducir movimiento»: marca la página con
// data-motion="live" (el CSS fija la portada y el Antes/Después solo entonces) y escribe variables CSS que únicamente
// mueven transform y opacity:
//   --p en la portada (apertura del abanico) y --x en el Antes/Después (0 Antes → 1 Después), ambas con inercia;
//   --t en cada [data-scrub] (destapado) y --q en cada trabajo (paralaje de sus columnas).
// Cada fotograma primero lee todas las posiciones y después escribe, y solo lo que ha cambiado.
export function HomeMotion() {
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(REDUCED).matches, () => true);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".portfolio-page");
    if (!root || reduced) return;
    root.dataset.motion = "live";
    type Smooth = { node: HTMLElement; name: string; map: (progress: number) => number; target: number; value: number };
    const smooth: Smooth[] = [];
    const hero = root.querySelector<HTMLElement>(".pub-hero"), pair = root.querySelector<HTMLElement>(".pub-ba");
    if (hero) smooth.push({ node: hero, name: "--p", map: (p) => p, target: 0, value: 0 });
    if (pair) smooth.push({ node: pair, name: "--x", map: crossing, target: 0, value: 0 });
    const scrubs = [...root.querySelectorAll<HTMLElement>("[data-scrub]")];
    const works = [...root.querySelectorAll<HTMLElement>(".pub-work")];
    const written = new WeakMap<HTMLElement, string>();
    const write = (node: HTMLElement, name: string, value: number) => {
      const text = value.toFixed(3);
      if (written.get(node) === name + text) return;
      written.set(node, name + text); node.style.setProperty(name, text);
    };
    let frame = 0;
    const tick = () => {
      frame = 0;
      const viewport = innerHeight;
      // Lectura.
      for (const item of smooth) { const box = item.node.getBoundingClientRect(); item.target = item.map(pinnedProgress(box.top, box.height, viewport)); }
      const reveals = scrubs.map((node) => revealProgress(node.getBoundingClientRect().top, viewport));
      const passes = works.map((node) => { const box = node.getBoundingClientRect(); return passProgress(box.top, box.height, viewport); });
      // Escritura.
      let moving = false;
      for (const item of smooth) { item.value = follow(item.value, item.target); if (item.value !== item.target) moving = true; write(item.node, item.name, item.value); }
      scrubs.forEach((node, index) => write(node, "--t", reveals[index]));
      works.forEach((node, index) => write(node, "--q", passes[index]));
      if (moving) frame = requestAnimationFrame(tick);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
    tick();
    addEventListener("scroll", schedule, { passive: true }); addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame); removeEventListener("scroll", schedule); removeEventListener("resize", schedule);
      delete root.dataset.motion;
      for (const node of [hero, pair, ...scrubs, ...works]) {
        for (const name of ["--p", "--x", "--t", "--q"]) node?.style.removeProperty(name);
      }
    };
  }, [reduced]);
  return null;
}
