import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/features/auth/forms";
import { privateContext } from "@/features/jobs/page-data";
import { Dock } from "@/features/workspace/dock";
export default async function PrivateLayout({ children }: { children: ReactNode }) {
  await privateContext();
  return <>
    <a className="skip-link" href="#content">Ir al contenido</a>
    <header className="topbar">
      <Link className="topbar-home" href="/app" aria-label="Iguana Garage, inicio de la gestión"><Brand /></Link>
      <LogoutButton />
    </header>
    <main id="content" className="shell">{children}</main>
    <Dock />
  </>;
}
