"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";

const SECTIONS: { href: string; label: string; icon: IconName; current: (path: string) => boolean }[] = [
  { href: "/app", label: "Trabajos", icon: "grid", current: (path) => path === "/app" || /^\/app\/jobs\/[^/]+$/.test(path) },
  { href: "/app/portada", label: "Portada", icon: "compare", current: (path) => path.startsWith("/app/portada") },
];
// Formularios: el dock cede su sitio a la barra de guardado del propio formulario (misma forma y lugar).
export const isFormPath = (path: string) => path === "/app/new" || /^\/app\/jobs\/[^/]+\/edit$/.test(path);

// Dock flotante: la navegación de la gestión, abajo y centrado en todas las anchuras. Las acciones viven siempre en esa
// capa inferior translúcida («barniz»); el contenido queda arriba, mate.
export function Dock() {
  const path = usePathname();
  if (isFormPath(path)) return null;
  return <nav className="dock" aria-label="Secciones de la gestión">
    {SECTIONS.map((section) => <Link key={section.href} href={section.href} className="dock-item" aria-current={section.current(path) ? "page" : undefined}><Icon name={section.icon} /><span>{section.label}</span></Link>)}
    <Link href="/app/new" className="dock-new"><Icon name="plus" /><span>Nuevo trabajo</span></Link>
  </nav>;
}
