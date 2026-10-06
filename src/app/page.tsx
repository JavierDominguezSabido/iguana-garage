/* eslint-disable @next/next/no-html-link-for-pages -- Navegación documental: volver a autorizar publicación sin prefetch ni Router Cache. */
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { publicJobs } from "@/features/portfolio/data";
import { portfolioPage } from "@/features/portfolio/delivery";
import { whatsappContact } from "@/features/portfolio/contact";
import { ContactLink } from "@/features/portfolio/contact-link";
import { PublicGallery } from "@/features/portfolio/gallery";
import { FeaturedTransformation } from "@/features/portfolio/featured-transformation";
import { selectFeaturedTransformation } from "@/features/portfolio/transformation";
import type { PublicJob } from "@/features/portfolio/contract";
import "./portfolio.css";

const description = "Iguana Garage. Chapa y pintura: fotografías de nuestros trabajos y contacto por WhatsApp.";
export const metadata: Metadata = {
  title: "Iguana Garage · Chapa y pintura",
  description,
  openGraph: { title: "Iguana Garage · Chapa y pintura", description, type: "website", locale: "es_ES", siteName: "Iguana Garage" },
  twitter: { card: "summary", title: "Iguana Garage · Chapa y pintura", description },
};
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const query = await searchParams;
  const page = portfolioPage(typeof query.page === "string" ? query.page : undefined);
  const contact = whatsappContact(process.env.IGUANA_WHATSAPP_NUMBER);
  let jobs: PublicJob[] = []; let hasNext = false; let failed = false;
  try { ({ jobs, hasNext } = await publicJobs(page)); } catch { failed = true; }
  const transformation = selectFeaturedTransformation(jobs);
  return <div className="portfolio-page" id="inicio">
    <a className="skip-link" href="#contenido-publico">Ir al contenido</a>
    <header className="pub-header"><div className="pub-shell pub-header-inner"><a href="#inicio" aria-label="Iguana Garage — inicio"><Brand /></a><nav aria-label="Navegación principal"><a href="#trabajos">Galería</a></nav></div></header>
    <main id="contenido-publico">
      <section className="pub-shell pub-hero" aria-labelledby="hero-title">
        <div className="pub-hero-copy"><p className="pub-kicker">TALLER DE CHAPA Y PINTURA</p><h1 id="hero-title">Chapa y pintura.<br /><span>Nueva piel, mismo coche.</span></h1></div>
        <div className="pub-hero-contact"><p className="pub-intro">Reparación y acabado.<br />Algunos resultados del taller.</p><div className="pub-hero-actions"><ContactLink contact={contact} /><a className="pub-text-action" href="#trabajos">Ver galería <span aria-hidden="true">↓</span></a></div></div>
      </section>
      {transformation && <FeaturedTransformation transformation={transformation} />}
      <section className="pub-shell pub-works" id="trabajos" aria-labelledby="works-title">
        <div className="pub-section-heading"><h2 id="works-title">Trabajos realizados</h2><p>Abre las fotos para ver cada trabajo.</p></div>
        {failed ? <div className="pub-state" role="alert"><p>No hemos podido cargar los trabajos.</p><a className="pub-text-action" href={`/?page=${page}#trabajos`}>Volver a cargar <span aria-hidden="true">↻</span></a></div> : !jobs.length ? <div className="pub-state"><p>{page === 1 ? "Estamos preparando las fotografías de nuestros trabajos." : "No hay más trabajos en esta página."}</p>{page > 1 && <a className="pub-text-action" href="/#trabajos">Volver a los trabajos</a>}</div> : <div className="pub-work-grid">{jobs.map((job, index) => <article key={job.id} className="pub-work" aria-labelledby={`job-${job.id}`}>
          <PublicGallery job={job} preload={!transformation && index === 0} sizes="(max-width: 699px) calc(100vw - 40px), (max-width: 1199px) calc((100vw - 88px) / 2), 606px" />
        </article>)}</div>}
        {!failed && (hasNext || page > 1) && <nav className="pub-pagination" aria-label="Páginas de trabajos">{page > 1 && <a className="pub-text-action" href={`/?page=${page - 1}#trabajos`}>← Más recientes</a>}<span>Página {page}</span>{hasNext && <a className="pub-text-action" href={`/?page=${page + 1}#trabajos`}>Trabajos anteriores →</a>}</nav>}
      </section>
      <section className="pub-contact" id="contacto" aria-labelledby="contact-title"><div className="pub-shell pub-contact-inner"><div><p className="pub-kicker">CHAPA Y PINTURA</p><h2 id="contact-title">¿Hablamos de tu coche?</h2><p>Cuéntanos qué necesitas.</p></div>{contact ? <ContactLink contact={contact} /> : <p className="pub-contact-pending">Nuestro contacto por WhatsApp estará disponible próximamente.</p>}</div></section>
    </main>
    <footer className="pub-shell pub-footer"><a href="#inicio" aria-label="Iguana Garage — volver al inicio"><Brand /></a><p>Chapa y pintura.</p><a href="#inicio" className="pub-text-action">Volver arriba ↑</a></footer>
  </div>;
}
