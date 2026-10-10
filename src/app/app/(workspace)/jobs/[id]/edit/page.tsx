import Link from "next/link";
import { Icon } from "@/components/icon";
import { JobForm } from "@/features/jobs/job-form";
import { privateJob } from "@/features/jobs/page-data";
export const metadata = { title: "Editar trabajo · Iguana Garage" };
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { job, media } = await privateJob((await params).id);
  return <><Link className="back-link" href={`/app/jobs/${job.id}`}><Icon name="back" size={20} />Volver al trabajo</Link><header className="page-head page-head-form"><h1>Editar trabajo</h1><p className="page-sub">{job.name}</p></header><JobForm initial={job} media={media} /></>;
}
