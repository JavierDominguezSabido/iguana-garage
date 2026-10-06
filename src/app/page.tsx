/* eslint-disable @next/next/no-html-link-for-pages -- Navegación documental: volver a autorizar publicación sin prefetch ni Router Cache. */
import Image from "next/image";
import type { Metadata } from "next";
import symbol from "../../assets/brand/iguana-garage-symbol.png";
import { Brand } from "@/components/brand";
import { publicJobs } from "@/features/portfolio/data";
import { portfolioPage, publicDate, portfolioHero } from "@/features/portfolio/delivery";
import { whatsappContact } from "@/features/portfolio/contact";
import { ContactLink } from "@/features/portfolio/contact-link";
import { PublicGallery } from "@/features/portfolio/gallery";
import { PublicPhoto } from "@/features/portfolio/photo";
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
  const hero = portfolioHero(jobs);
  return <div className="portfolio-page" id="inicio">
    <a className="skip-link" href="#contenido-publico">Ir al contenido</a>
    <header className="pub-header"><div className="pub-shell pub-header-inner"><a href="#inicio" aria-label="Iguana Garage — inicio"><Brand /></a><nav aria-label="Navegación principal"><a href="#trabajos">Trabajos</a><a href="#contacto">Contacto</a></nav></div></header>
    <main id="contenido-publico">
      <section className="pub-shell pub-hero" aria-labelledby="hero-title"><div className="pub-hero-copy"><p className="pub-kicker">IGUANA GARAGE · CHAPA Y PINTURA</p><h1 id="hero-title">Chapa y pintura.<br /><span>Trabajo real.</span></h1><p className="pub-intro">Reparación y acabado.<br />Un vistazo al trabajo de nuestro taller.</p><div className="pub-hero-actions"><ContactLink contact={contact} /><a className="pub-text-action" href="#trabajos">Ver trabajos <span aria-hidden="true">↓</span></a></div></div>
        <figure className={`pub-hero-figure ${hero ? "" : "pub-hero-mark"}`}>{hero ? <><PublicPhoto jobId={hero.id} mediaId={hero.media[0].id} alt={`${hero.name}, fotografía del taller`} sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1199px) 45vw, 590px" preload /><figcaption>{hero.name}<span><time dateTime={hero.job_date}>{publicDate(hero.job_date)}</time></span></figcaption></> : <Image src={symbol} alt="" unoptimized width={1312} height={1199} />}</figure>
      </section>
      <section className="pub-shell pub-works" id="trabajos" aria-labelledby="works-title"><div className="pub-section-heading"><div><p className="pub-kicker">EL TALLER, EN FOTOGRAFÍAS</p><h2 id="works-title">Trabajos realizados</h2></div><p>Cada trabajo, con sus propias fotos.<br />Tócalas para verlas completas.</p></div>
        {failed ? <div className="pub-state" role="alert"><p>No hemos podido cargar los trabajos.</p><a className="pub-text-action" href={`/?page=${page}#trabajos`}>Volver a cargar <span aria-hidden="true">↻</span></a></div> : !jobs.length ? <div className="pub-state"><p>{page === 1 ? "Estamos preparando las fotografías de nuestros trabajos." : "No hay más trabajos en esta página."}</p>{page > 1 && <a className="pub-text-action" href="/#trabajos">Volver a los trabajos</a>}</div> : <div className="pub-work-grid">{jobs.map((job, index) => <article key={job.id} className="pub-work" aria-labelledby={`job-${job.id}`}><div className="pub-work-photo"><PublicGallery job={job} sizes={index === 0 ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1199px) 58vw, 740px" : index === jobs.length - 1 && jobs.length % 2 === 0 ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1199px) 44vw, 740px" : "(max-width: 767px) calc(100vw - 40px), (max-width: 1199px) 44vw, 590px"} /></div><div className="pub-work-caption"><p className="pub-work-date"><span>{String((page - 1) * 12 + index + 1).padStart(2, "0")}</span><time dateTime={job.job_date}>{publicDate(job.job_date)}</time></p><h3 id={`job-${job.id}`}>{job.name}</h3><p className="pub-work-count">{job.media.length} {job.media.length === 1 ? "fotografía" : "fotografías"}</p></div></article>)}</div>}
        {!failed && (hasNext || page > 1) && <nav className="pub-pagination" aria-label="Páginas de trabajos">{page > 1 && <a className="pub-text-action" href={`/?page=${page - 1}#trabajos`}>← Más recientes</a>}<span>Página {page}</span>{hasNext && <a className="pub-text-action" href={`/?page=${page + 1}#trabajos`}>Trabajos anteriores →</a>}</nav>}
      </section>
      <section className="pub-contact" id="contacto" aria-labelledby="contact-title"><div className="pub-shell pub-contact-inner"><div><p className="pub-kicker">CHAPA Y PINTURA</p><h2 id="contact-title">¿Hablamos de tu coche?</h2><p>Cuéntanos qué necesitas.</p></div>{contact ? <ContactLink contact={contact} /> : <p className="pub-contact-pending">Nuestro contacto por WhatsApp estará disponible próximamente.</p>}</div></section>
    </main>
    <footer className="pub-shell pub-footer"><a href="#inicio" aria-label="Iguana Garage — volver al inicio"><Brand /></a><p>Chapa y pintura.<br />Trabajo real, en imágenes.</p><a href="#inicio" className="pub-text-action">Volver arriba ↑</a></footer>
  </div>;
}
