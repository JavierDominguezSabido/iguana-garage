"use client";
import { useEffect } from "react";

const PAINT_WAIT_MS = 700;
// Espera a que la foto esté cargada (o a un tope) para que la pasada de pintura descubra la imagen y no un hueco.
function photoReady(element: HTMLElement): Promise<void> {
  const image = element.querySelector("img");
  if (!image || image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { image.removeEventListener("load", done); image.removeEventListener("error", done); window.clearTimeout(timer); resolve(); };
    const timer = window.setTimeout(done, PAINT_WAIT_MS);
    image.addEventListener("load", done); image.addEventListener("error", done);
  });
}

// Entrada al hacer scroll: solo oculta (data-hidden) lo que está por debajo del primer pantallazo y lo
// revela al acercarse. Los titulares y bandas (data-reveal) funden y suben; las fotos del muro (data-paint)
// se descubren con una franja verde (data-sweep). Sin JavaScript, o con prefers-reduced-motion, todo
// permanece visible desde el principio.
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active = true;
    const pending = [...document.querySelectorAll<HTMLElement>("[data-reveal], [data-paint]")].filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.92);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        if (!element.hasAttribute("data-paint")) { element.removeAttribute("data-hidden"); continue; }
        void photoReady(element).then(() => { if (!active) return; element.setAttribute("data-sweep", ""); element.removeAttribute("data-hidden"); });
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (const element of pending) { element.setAttribute("data-hidden", ""); observer.observe(element); }
    return () => { active = false; observer.disconnect(); for (const element of pending) { element.removeAttribute("data-hidden"); element.removeAttribute("data-sweep"); } };
  }, []);
  return null;
}
