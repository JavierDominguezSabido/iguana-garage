import Link from "next/link";
export default function MissingJob() { return <section className="empty"><h1>Trabajo no encontrado</h1><p>No existe o no está en tu área privada.</p><Link href="/app" className="button primary">Ver todos los trabajos</Link></section>; }
