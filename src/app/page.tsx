/* eslint-disable @next/next/no-html-link-for-pages -- Navegación documental: volver a autorizar publicación sin prefetch ni Router Cache. */
import type { Metadata } from "next";
import Image from "next/image";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Brand } from "@/components/brand";
import { publicJobs } from "@/features/portfolio/data";
import { portfolioPage } from "@/features/portfolio/delivery";
import { whatsappContact } from "@/features/portfolio/contact";
import { ContactLink } from "@/features/portfolio/contact-link";
import { PublicGallery } from "@/features/portfolio/gallery";
import { FeaturedTransformation } from "@/features/portfolio/featured-transformation";
import { RevealOnScroll } from "@/features/portfolio/reveal";
import { selectFeaturedTransformation } from "@/features/portfolio/transformation";
import type { PublicJob } from "@/features/portfolio/contract";
import symbol from "../../assets/brand/iguana-garage-symbol.png";
import "./portfolio.css";

// Tipografía pública autoalojada por next/font: titulares condensados + texto de lectura.
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-pub-display", display: "swap" });
const text = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-pub-text", display: "swap" });

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
  return <div className={`portfolio-page ${display.variable} ${text.variable}`} id="inicio">
    <RevealOnScroll />
    <a className="skip-link" href="#contenido-publico">Ir al contenido</a>
    <header className="pub-header"><div className="pub-header-inner"><a href="#inicio" aria-label="Iguana Garage — inicio"><Brand /></a><ContactLink contact={contact} compact /></div></header>
    <main id="contenido-publico">
      <section className={`pub-hero${transformation ? "" : " pub-hero-solo"}`} aria-labelledby="hero-title">
        <Image className="pub-symbol" src={symbol} alt="" aria-hidden="true" sizes="(min-width: 700px) 520px, 250px" fetchPriority="low" />
        <h1 id="hero-title"><span>Chapa</span> <span>y pintura<span className="pub-dot">.</span></span></h1>
        {transformation && <p className="pub-lead">Arrastra para ver el antes y el después</p>}
        {transformation && <FeaturedTransformation transformation={transformation} />}
        <div className="pub-hero-actions"><ContactLink contact={contact} /></div>
      </section>
      <section className="pub-works" id="trabajos" aria-labelledby="works-title">
        <div className="pub-works-head" data-reveal><h2 id="works-title">Trabajos realizados</h2></div>
        {failed ? <div className="pub-state" role="alert"><p>No hemos podido cargar los trabajos.</p><a className="pub-text-action" href={`/?page=${page}#trabajos`}>Volver a cargar <span aria-hidden="true">↻</span></a></div> : !jobs.length ? <div className="pub-state"><p>{page === 1 ? "Estamos preparando las fotografías de nuestros trabajos." : "No hay más trabajos en esta página."}</p>{page > 1 && <a className="pub-text-action" href="/#trabajos">Volver a los trabajos</a>}</div> : <div className="pub-work-list">{jobs.map((job) => <PublicGallery key={job.id} job={job} />)}</div>}
        {!failed && (hasNext || page > 1) && <nav className="pub-pagination" aria-label="Páginas de trabajos">{page > 1 && <a className="pub-text-action" href={`/?page=${page - 1}#trabajos`}>← Más recientes</a>}<span>Página {page}</span>{hasNext && <a className="pub-text-action" href={`/?page=${page + 1}#trabajos`}>Trabajos anteriores →</a>}</nav>}
      </section>
      <section className="pub-contact" id="contacto" aria-labelledby="contact-title"><div className="pub-contact-inner" data-reveal><div><h2 id="contact-title">¿Hablamos de tu coche?</h2><p>Cuéntanos qué necesitas.</p></div>{contact ? <ContactLink contact={contact} /> : <p className="pub-contact-pending">Nuestro contacto por WhatsApp estará disponible próximamente.</p>}</div></section>
    </main>
    <footer className="pub-footer"><a href="#inicio" aria-label="Iguana Garage — volver al inicio"><Brand /></a><p>Chapa y pintura.</p><a href="#inicio" className="pub-text-action">Volver arriba ↑</a></footer>
  </div>;
}
