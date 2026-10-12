import { PasswordChangeForm } from "@/features/auth/forms";
import { privateContext } from "@/features/jobs/page-data";
export const metadata = { title: "Cuenta · Iguana Garage" };
export default async function AccountPage() {
  const { user } = await privateContext();
  const email = user.email ?? "";
  return <>
    <header className="page-head page-head-form"><h1>Cuenta</h1><p className="page-sub">Entras como <strong className="account-email">{email}</strong>.</p></header>
    <section className="panel account-panel" aria-labelledby="password-title">
      <h2 className="panel-title" id="password-title">Cambiar contraseña</h2>
      <PasswordChangeForm email={email} />
    </section>
  </>;
}
