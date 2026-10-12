"use client";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "./icons";

// Botón redondo fijo abajo a la derecha, en todas las anchuras. Arranca oculto y se retira mientras se ve alguna
// zona marcada con [data-fab-hide] (titular de la portada, contacto y pie) para no duplicar el CTA; con el visor
// abierto el CSS lo oculta y el dialog modal lo deja inerte. Oculto = visibility: hidden (fuera del tabulador).
export function FloatingContact({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const zones = [...document.querySelectorAll("[data-fab-hide]")];
    if (!zones.length || !("IntersectionObserver" in window)) return;
    const showing = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) showing.add(entry.target); else showing.delete(entry.target); }
      setVisible(showing.size === 0);
    });
    for (const zone of zones) observer.observe(zone);
    return () => observer.disconnect();
  }, []);
  return <a className="pub-fab" data-visible={visible} href={href} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp (abre WhatsApp en otra pestaña)"><WhatsAppIcon /></a>;
}
