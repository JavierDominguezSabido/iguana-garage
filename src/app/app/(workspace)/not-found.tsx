import Link from "next/link";
export default function MissingJob() { return <section className="empty-state"><h1>Trabajo no encontrado</h1><p className="muted">No está disponible en tu área privada.</p><Link href="/app" className="button primary">Volver a trabajos</Link></section>; }
