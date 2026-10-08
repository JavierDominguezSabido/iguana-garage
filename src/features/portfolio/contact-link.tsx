import type { whatsappContact } from "./contact";
// `compact` es la versión corta de la cabecera: el mismo enlace con la etiqueta «WhatsApp».
export function ContactLink({ contact, className = "", compact = false }: { contact: ReturnType<typeof whatsappContact>; className?: string; compact?: boolean }) {
  return contact ? <a className={`pub-cta ${className}`} href={contact.href} target="_blank" rel="noopener noreferrer">{compact ? "WhatsApp" : "Escríbenos por WhatsApp"} <span aria-hidden="true">↗</span><span className="pub-sr-only"> (abre WhatsApp en otra pestaña)</span></a>
    : <a className={`pub-cta ${className}`} href="#contacto">Contacto <span aria-hidden="true">↗</span></a>;
}
