/* eslint-disable @next/next/no-html-link-for-pages -- Navegación documental: volver a autorizar publicación sin prefetch ni Router Cache. */
import type { Metadata } from "next";
import Image from "next/image";
import { Big_Shoulders, Saira } from "next/font/google";
import { homeData } from "@/features/portfolio/data";
import { portfolioPage } from "@/features/portfolio/delivery";
import { whatsappContact } from "@/features/portfolio/contact";
import { ContactLink } from "@/features/portfolio/contact-link";
import { PublicGallery } from "@/features/portfolio/gallery";
import { BeforeAfter } from "@/features/portfolio/before-after";
import { HeroFan } from "@/features/portfolio/fan";
import { FloatingContact } from "@/features/portfolio/floating-contact";
import { HomeMotion } from "@/features/portfolio/home-motion";
import { Provisional } from "@/features/portfolio/provisional";
import logo from "../../assets/brand/iguana-garage-logo-horizontal.png";
import "./portfolio.css";

// Tipografía pública autoalojada por next/font: condensada industrial para titulares + Saira para el texto.
const display = Big_Shoulders({ subsets: ["latin"], axes: ["opsz"], variable: "--font-pub-display", display: "swap" });
const text = Saira({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-pub-text", display: "swap" });

// Logo oficial escalado por el optimizador de next/image (solo /_next/static/media/**): el PNG original pesa 256 KB.
const Logo = ({ sizes, priority = false }: { sizes: string; priority?: boolean }) => <Image src={logo} alt="Iguana Garage" className="brand" sizes={sizes} priority={priority} />;

const description = "Iguana Garage. Chapa y pintura: fotografías de nuestros trabajos y contacto por WhatsApp.";
// Imagen para compartir: estática y solo de marca (logo oficial sobre Carbon), sin fotos de trabajos.
// og:image debe ser absoluta: Render expone RENDER_EXTERNAL_URL; sin ella se usa la URL de producción.
const shareImage = { url: "/share/iguana-garage-og.png", width: 1200, height: 630, alt: "Iguana Garage · Chapa y pintura" };
export const metadata: Metadata = {
  metadataBase: new URL(process.env.RENDER_EXTERNAL_URL || "https://iguana-garage.onrender.com"),
  title: "Iguana Garage · Chapa y pintura",
  description,
  openGraph: { title: "Iguana Garage · Chapa y pintura", description, type: "website", locale: "es_ES", siteName: "Iguana Garage", images: [shareImage] },
  twitter: { card: "summary_large_image", title: "Iguana Garage · Chapa y pintura", description, images: [{ url: shareImage.url, alt: shareImage.alt }] },
};
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const query = await searchParams;
  const page = portfolioPage(typeof query.page === "string" ? query.page : undefined);
  const contact = whatsappContact(process.env.IGUANA_WHATSAPP_NUMBER);
  const { jobs, hasNext, failed, transformation } = await homeData(page);
  return <div className={`portfolio-page ${display.variable} ${text.variable}`} id="inicio">
    <HomeMotion />
    <a className="skip-link" href="#contenido-publico">Ir al contenido</a>
    <header className="pub-header">
      <a href="#inicio" className="pub-logo" aria-label="Iguana Garage — inicio"><Logo sizes="(min-width: 1100px) 228px, 182px" priority /></a>
      {!contact && <ContactLink contact={contact} compact />}
    </header>
    <main id="contenido-publico">
      <section className="pub-hero" aria-labelledby="hero-title">
        <div className="pub-hero-stage">
          <span className="pub-livery" aria-hidden="true" />
          <div className="pub-hero-copy" data-fab-hide="">
            <h1 id="hero-title"><span className="pub-line"><span>Chapa y</span></span> <span className="pub-line"><span>pintura<span className="pub-dot">.</span></span></span></h1>
            <div className="pub-hero-row">
              <ContactLink contact={contact} />
              {jobs.length > 0 && <p className="pub-hint"><Provisional>Baja y se abre el abanico.</Provisional></p>}
            </div>
          </div>
          <HeroFan jobs={jobs} />
        </div>
      </section>
      {transformation && <BeforeAfter transformation={transformation} />}
      <section className="pub-works" id="trabajos" aria-labelledby="works-title">
        <h2 id="works-title" className="pub-works-title" data-scrub=""><span>Trabajos</span> <span>realizados</span></h2>
        {failed ? <div className="pub-state" role="alert"><p>No hemos podido cargar los trabajos.</p><a className="pub-text-action" href={`/?page=${page}#trabajos`}>Volver a cargar <span aria-hidden="true">↻</span></a></div> : !jobs.length ? <div className="pub-state"><p>{page === 1 ? "Estamos preparando las fotografías de nuestros trabajos." : "No hay más trabajos en esta página."}</p>{page > 1 && <a className="pub-text-action" href="/#trabajos">Volver a los trabajos</a>}</div> : <div className="pub-work-list">{jobs.map((job) => <PublicGallery key={job.id} job={job} />)}</div>}
        {!failed && (hasNext || page > 1) && <nav className="pub-pagination" aria-label="Páginas de trabajos">{page > 1 && <a className="pub-more" href={`/?page=${page - 1}#trabajos`}>← Más recientes</a>}<span>Página {page}</span>{hasNext && <a className="pub-more" href={`/?page=${page + 1}#trabajos`}>Trabajos anteriores →</a>}</nav>}
      </section>
      <section className="pub-contact" id="contacto" aria-labelledby="contact-title" data-fab-hide="">
        <h2 id="contact-title" className="pub-contact-title" data-scrub=""><span>¿Hablamos</span> <span>de tu coche?</span></h2>
        <p>Cuéntanos qué necesitas.</p>
        {contact ? <ContactLink contact={contact} /> : <p className="pub-contact-pending">Nuestro contacto por WhatsApp estará disponible próximamente.</p>}
      </section>
    </main>
    <footer className="pub-footer" data-fab-hide=""><a href="#inicio" className="pub-logo" aria-label="Iguana Garage — volver al inicio"><Logo sizes="(min-width: 520px) 489px, 96vw" /></a><p>Chapa y pintura.</p><a href="#inicio" className="pub-text-action">Volver arriba ↑</a></footer>
    {contact && <FloatingContact href={contact.href} />}
  </div>;
}
