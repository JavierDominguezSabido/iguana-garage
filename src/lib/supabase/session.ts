import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./config";

function noCache(response: NextResponse) {
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("pragma", "no-cache");
  response.headers.set("expires", "0");
  return response;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  try {
    const { url, key } = getSupabaseConfig();
    const supabase = createServerClient<Database>(url, key, {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          const previousCookies = response.cookies.getAll();
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          previousCookies.forEach((cookie) => response.cookies.set(cookie));
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    // Consulta al servidor Auth: identidad actual, no confianza en getSession()/cookies sin validar.
    const { data, error } = await supabase.auth.getUser();
    if (error && (error.status ?? 0) >= 500) throw new Error("Auth no disponible");
    if (request.nextUrl.pathname.startsWith("/app") && (error || !data.user || data.user.is_anonymous)) {
      const redirect = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return noCache(redirect);
    }
    return noCache(response);
  } catch {
    const failure = new NextResponse("Servicio de autenticación no disponible", { status: 503 });
    response.cookies.getAll().forEach((cookie) => failure.cookies.set(cookie));
    return noCache(failure);
  }
}
