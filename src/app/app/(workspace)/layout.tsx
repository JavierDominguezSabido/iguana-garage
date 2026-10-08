import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/features/auth/forms";
import { privateContext } from "@/features/jobs/page-data";
export default async function PrivateLayout({ children }: { children: ReactNode }) {
  await privateContext();
  return <><a className="skip-link" href="#content">Ir al contenido</a><header className="private-header"><div className="header-inner"><Link href="/app" aria-label="Iguana Garage — trabajos"><Brand /></Link><span className="header-caption">ÁREA PRIVADA</span><LogoutButton /></div></header><main id="content" className="workspace">{children}</main><footer className="private-footer">Iguana Garage <span>Chapa y pintura</span></footer></>;
}
