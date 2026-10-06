import type { whatsappContact } from "./contact";
export function ContactLink({ contact, className = "" }: { contact: ReturnType<typeof whatsappContact>; className?: string }) {
  return contact ? <a className={`pub-cta ${className}`} href={contact.href} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp <span aria-hidden="true">↗</span><span className="pub-sr-only"> (abre WhatsApp en otra pestaña)</span></a>
    : <a className={`pub-cta ${className}`} href="#contacto">Contacto <span aria-hidden="true">↗</span></a>;
}
