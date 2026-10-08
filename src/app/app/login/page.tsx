import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/forms";
export const metadata = { title: "Acceso privado · Iguana Garage" };
export default async function LoginPage() {
  const db = await createServerSupabaseClient(); const { data } = await db.auth.getUser();
  if (data.user && !data.user.is_anonymous) redirect("/app");
  return <main className="login-page"><section className="login-panel"><Brand /><p className="eyebrow">CHAPA Y PINTURA</p><h1>Acceso privado</h1><p className="muted">Los trabajos de tu taller,<br />en un solo lugar.</p><LoginForm /><p className="login-footnote">Iguana Garage · Área de gestión</p></section></main>;
}
