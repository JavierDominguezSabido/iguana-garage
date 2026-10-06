import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const https = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")) === "https";
  let url = "";
  // El DAL y Auth gestionan el error de configuración; CSP debe seguir cerrada sin ocultarlos.
  try { ({ url } = getSupabaseConfig()); } catch {}
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Next/Image y los indicadores de progreso usan atributos style; no habilita JS inline.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${url ? ` ${url}` : ""}${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  // Next necesita la política en la petición para aplicar el nonce a sus scripts/styles SSR.
  request.headers.set("content-security-policy", policy);
  request.headers.set("x-nonce", nonce);
  const response = request.nextUrl.pathname === "/"
    ? NextResponse.next({ request })
    : await updateSession(request);
  response.headers.set("content-security-policy", policy);
  return response;
}
export const config = { matcher: ["/", "/app/:path*", "/login"] };
