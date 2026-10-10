"use client";
import { useActionState, useState } from "react";
import { login, logout } from "./actions";
import { Icon } from "@/components/icon";
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" }); const [visible, setVisible] = useState(false);
  return <form action={action} className="login-form">
    <div className="field"><label htmlFor="email">Usuario</label><input id="email" name="email" type="email" autoComplete="username" inputMode="email" required maxLength={320} placeholder="Tu email" /></div>
    <div className="field"><label htmlFor="password">Contraseña</label><div className="password-field"><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={1024} /><button className="icon-button" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}><Icon name={visible ? "hide" : "eye"} /></button></div></div>
    {state.error && <p className="alert" role="alert"><Icon name="alert" />{state.error}</p>}
    <button className="button primary wide" disabled={pending}>{pending ? "Entrando…" : "Entrar"}<Icon name="forward" /></button>
  </form>;
}
export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { error: "" });
  return <form action={action} className="logout-form"><button className="logout-button" disabled={pending} aria-label="Cerrar sesión"><Icon name="exit" /><span>{pending ? "Saliendo…" : "Cerrar sesión"}</span></button>{state.error && <p role="alert" className="alert">{state.error}</p>}</form>;
}
