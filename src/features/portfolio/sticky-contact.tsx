"use client";
import { useEffect, useState } from "react";

// Botón fijo de WhatsApp solo en móvil. Aparece cuando el título sale de pantalla y se retira al llegar a
// «contacto» o al pie para no tapar el contenido final ni duplicar el CTA. El visor modal lo deja inerte y
// el CSS lo oculta mientras hay un visor abierto.
export function StickyContact({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const title = document.getElementById("hero-title");
    const ends = [document.getElementById("contacto"), document.querySelector(".pub-footer")].filter((element): element is Element => element !== null);
    if (!title || !("IntersectionObserver" in window)) return;
    let titleVisible = true;
    const endsVisible = new Set<Element>();
    const update = () => setVisible(!titleVisible && endsVisible.size === 0);
    const titleObserver = new IntersectionObserver(([entry]) => { titleVisible = entry.isIntersecting; update(); });
    const endObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) endsVisible.add(entry.target); else endsVisible.delete(entry.target); }
      update();
    });
    titleObserver.observe(title);
    for (const element of ends) endObserver.observe(element);
    return () => { titleObserver.disconnect(); endObserver.disconnect(); };
  }, []);
  return <a className="pub-sticky" data-visible={visible} href={href} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp <span aria-hidden="true">↗</span><span className="pub-sr-only"> (abre WhatsApp en otra pestaña)</span></a>;
}
