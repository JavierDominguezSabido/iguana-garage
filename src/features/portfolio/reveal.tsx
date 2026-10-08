"use client";
import { useEffect } from "react";
import { photoEntry } from "./photo-entry";

const DECODE_STALL_MS = 1500;
// Resuelve cuando la foto del recuadro está cargada y decodificada (o ha fallado: entonces se enseña su aviso).
// La carga manda: solo si una imagen YA cargada no llegara a resolver decode() se libera tras un tope, para que
// ninguna foto quede invisible por un decode() colgado.
function photoReady(tile: HTMLElement): Promise<void> {
  const image = tile.querySelector("img");
  if (!image) return Promise.resolve();
  const decoded = () => Promise.race([image.decode().catch(() => {}), new Promise<void>((resolve) => window.setTimeout(resolve, DECODE_STALL_MS))]);
  if (image.complete) return decoded();
  return new Promise((resolve) => {
    const done = () => { image.removeEventListener("load", done); image.removeEventListener("error", done); void decoded().then(resolve); };
    image.addEventListener("load", done); image.addEventListener("error", done);
  });
}

// Entrada al hacer scroll. Solo oculta lo que está bajo el primer pantallazo y lo revela al acercarse; sin
// JavaScript, o con prefers-reduced-motion, todo permanece visible desde el principio.
//  - Titulares y bandas (data-reveal): funden y suben al entrar en pantalla.
//  - Fotos del muro (data-wall-photo): no se animan hasta estar cargadas y decodificadas; mientras, el hueco
//    reservado muestra un brillo de carga. Estados en data-wall (ver photo-entry.ts y portfolio.css).
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active = true;
    const below = (element: HTMLElement) => element.getBoundingClientRect().top > window.innerHeight * 0.92;

    const pending = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(below);
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.removeAttribute("data-hidden");
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (const element of pending) { element.setAttribute("data-hidden", ""); revealObserver.observe(element); }

    type Tile = { visible: boolean; ready: boolean; readyWhileVisible: boolean; done: boolean };
    const tiles = new Map<HTMLElement, Tile>();
    const apply = (element: HTMLElement, tile: Tile) => {
      if (!active || tile.done) return;
      const entry = photoEntry(tile);
      element.setAttribute("data-wall", entry);
      if (entry === "rise" || entry === "fade") { tile.done = true; photoObserver.unobserve(element); }
    };
    const photoObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement, tile = tiles.get(element);
        if (!tile || tile.done) continue;
        tile.visible = entry.isIntersecting; apply(element, tile);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    const finished = (event: AnimationEvent) => { if (/^pub-(rise|fade)-in$/.test(event.animationName)) (event.currentTarget as HTMLElement).removeAttribute("data-wall"); };
    for (const element of document.querySelectorAll<HTMLElement>("[data-wall-photo]")) {
      const box = element.getBoundingClientRect(), image = element.querySelector("img");
      if (box.bottom <= 0) continue;                                                       // ya superada
      const inView = !below(element);
      if (inView && image?.complete && image.naturalWidth > 0) continue;                   // ya pintada en la primera pantalla
      const tile: Tile = { visible: inView, ready: false, readyWhileVisible: false, done: false };
      tiles.set(element, tile);
      element.addEventListener("animationend", finished);
      apply(element, tile); photoObserver.observe(element);
      void photoReady(element).then(() => { tile.ready = true; tile.readyWhileVisible = tile.visible; apply(element, tile); });
    }
    return () => {
      active = false; revealObserver.disconnect(); photoObserver.disconnect();
      for (const element of pending) element.removeAttribute("data-hidden");
      for (const element of tiles.keys()) { element.removeAttribute("data-wall"); element.removeEventListener("animationend", finished); }
    };
  }, []);
  return null;
}
