"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="empty-state" role="alert"><h1>No se pudo cargar</h1><p className="muted">Comprueba tu conexión y vuelve a intentarlo. Tus datos guardados se conservan.</p><button onClick={reset} className="button primary">Reintentar</button></section>; }
