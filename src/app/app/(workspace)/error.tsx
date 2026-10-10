"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="empty" role="alert"><h1>No se pudo cargar</h1><p>Comprueba la conexión y vuelve a intentarlo. Lo que ya estaba guardado se conserva.</p><button type="button" onClick={reset} className="button primary">Reintentar</button></section>; }
