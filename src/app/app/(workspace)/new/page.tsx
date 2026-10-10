import Link from "next/link";
import { Icon } from "@/components/icon";
import { JobForm } from "@/features/jobs/job-form";
import { privateContext } from "@/features/jobs/page-data";
export const metadata = { title: "Nuevo trabajo · Iguana Garage" };
export default async function NewJobPage() {
  await privateContext();
  return <><Link className="back-link" href="/app"><Icon name="back" size={20} />Todos los trabajos</Link><header className="page-head page-head-form"><h1>Nuevo trabajo</h1><p className="page-sub">Se guarda como privado hasta que decidas publicarlo.</p></header><JobForm /></>;
}
