import Link from "next/link";
import { Icon } from "@/components/icon";
import { JobForm } from "@/features/jobs/job-form";
import { privateContext } from "@/features/jobs/page-data";
export const metadata = { title: "Nuevo trabajo · Iguana Garage" };
export default async function NewJobPage() {
  await privateContext();
  return <><Link className="back-link" href="/app"><Icon name="arrow" />Trabajos</Link><div className="page-heading"><div><p className="eyebrow">AÑADIR AL TALLER</p><h1>Nuevo trabajo</h1><p className="muted">Guarda una reparación terminada.</p></div></div><JobForm /></>;
}
