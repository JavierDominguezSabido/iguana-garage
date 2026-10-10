import type {ReactNode} from "react";
import {Hubot_Sans,Mona_Sans} from "next/font/google";
import {privateAppMetadata,privateAppViewport} from "@/features/pwa/metadata";
import "./app.css";

// Tipografía de la gestión, autoalojada por next/font: Hubot Sans (técnica, para titulares, posiciones y códigos) y
// Mona Sans (texto e interfaz). Solo existe bajo /app; la home pública conserva la suya.
const display=Hubot_Sans({subsets:["latin"],variable:"--font-app-display",display:"swap",axes:["wdth"]});
const text=Mona_Sans({subsets:["latin"],variable:"--font-app-text",display:"swap"});

// El login y la gestión comparten identidad PWA; el guard y el chrome privado
// siguen exclusivamente en (workspace), además de las autorizaciones por operación.
export const metadata=privateAppMetadata;
export const viewport=privateAppViewport;
export default function AppLayout({children}:{children:ReactNode}) {return <div className={`app ${display.variable} ${text.variable}`}>{children}</div>;}
