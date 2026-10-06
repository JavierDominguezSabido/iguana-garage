import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export function proxy(request: NextRequest) { return updateSession(request); }
export const config = { matcher: ["/app/:path*", "/login"] };
