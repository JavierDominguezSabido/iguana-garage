import type {ReactNode} from "react";
import {privateAppMetadata,privateAppViewport} from "@/features/pwa/metadata";

// El login y la gestión comparten identidad PWA; el guard y el chrome privado
// siguen exclusivamente en (workspace), además de las autorizaciones por operación.
export const metadata=privateAppMetadata;
export const viewport=privateAppViewport;
export default function AppLayout({children}:{children:ReactNode}) {return children;}
