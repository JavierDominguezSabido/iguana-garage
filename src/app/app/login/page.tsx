import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/forms";
export const metadata = { title: "Acceso privado · Iguana Garage" };
export default async function LoginPage() {
  const db = await createServerSupabaseClient(); const { data } = await db.auth.getUser();
  if (data.user && !data.user.is_anonymous) redirect("/app");
  return <main className="login">
    <section className="login-card" aria-labelledby="login-title">
      <Brand />
      <div className="login-copy"><h1 id="login-title">Acceso privado</h1><p>Gestiona los trabajos del taller y lo que se ve en la web.</p></div>
      <LoginForm />
    </section>
  </main>;
}
