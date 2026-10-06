"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key, { cookieOptions: { secure: process.env.NODE_ENV === "production" } });
}
