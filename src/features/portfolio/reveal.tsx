"use client";
import { useEffect } from "react";

// Entrada sutil al hacer scroll: solo oculta (data-hidden) lo que está por debajo del primer pantallazo y lo
// revela al acercarse. Sin JavaScript, o con prefers-reduced-motion, todo permanece visible desde el principio.
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pending = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.92);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.removeAttribute("data-hidden");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (const element of pending) { element.setAttribute("data-hidden", ""); observer.observe(element); }
    return () => { observer.disconnect(); for (const element of pending) element.removeAttribute("data-hidden"); };
  }, []);
  return null;
}
