export function getSupabaseConfig(input = {
  // Accesos literales necesarios para el reemplazo de NEXT_PUBLIC_* en Next.js.
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
}): { url: string; key: string } {
  const invalid = () => new Error("Configuración de Supabase inválida");
  if (!input.url || !input.key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(input.key)) throw invalid();
  let url: URL;
  try { url = new URL(input.url); } catch { throw invalid(); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw invalid();
  return { url: url.origin, key: input.key };
}
