"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword, login, logout } from "./actions";
import { PASSWORD_MIN } from "./password";
import type { PasswordChangeState, PasswordField } from "./password";
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

const PASSWORD_FIELDS: { field: PasswordField; name: string; label: string; toggle: string; autoComplete: string; help?: string }[] = [
  { field: "current", name: "current-password", label: "Contraseña actual", toggle: "Mostrar contraseña actual", autoComplete: "current-password" },
  { field: "next", name: "new-password", label: "Nueva contraseña", toggle: "Mostrar nueva contraseña", autoComplete: "new-password", help: `Al menos ${PASSWORD_MIN} caracteres y distinta de la actual. Mejor una frase larga que solo tú recuerdes.` },
  { field: "confirm", name: "confirm-password", label: "Repite la nueva contraseña", toggle: "Mostrar contraseña repetida", autoComplete: "new-password" },
];
const ALL_HIDDEN: Record<PasswordField, boolean> = { current: false, next: false, confirm: false };
// Tras cada envío React vacía el formulario y se vuelven a ocultar: las contraseñas no se quedan en la página ni vuelven
// del servidor. Si hay error, el foco va al campo que lo provoca.
export function PasswordChangeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, { status: "idle", message: "" } as PasswordChangeState);
  const [visible, setVisible] = useState(ALL_HIDDEN);
  const inputs = useRef<Partial<Record<PasswordField, HTMLInputElement | null>>>({});
  useEffect(() => {
    if (state.status === "error" && state.field) inputs.current[state.field]?.focus();
  }, [state]);
  return <form action={action} onSubmit={() => setVisible(ALL_HIDDEN)} className="password-form">
    <input type="email" autoComplete="username" value={email} readOnly hidden />
    {PASSWORD_FIELDS.map(({ field, name, label, toggle, autoComplete, help }) => {
      const invalid = state.status === "error" && state.field === field;
      const describedBy = [help && `${name}-help`, invalid && "password-feedback"].filter(Boolean).join(" ") || undefined;
      return <div className="field" key={field}>
        <label htmlFor={name}>{label}</label>
        <div className="password-field">
          <input id={name} name={name} ref={(element) => { inputs.current[field] = element; }} type={visible[field] ? "text" : "password"} autoComplete={autoComplete} required maxLength={1024} spellCheck={false} autoCapitalize="none" aria-invalid={invalid || undefined} aria-describedby={describedBy} />
          <button className="icon-button" type="button" onClick={() => setVisible((current) => ({ ...current, [field]: !current[field] }))} aria-label={toggle} aria-pressed={visible[field]}><Icon name={visible[field] ? "hide" : "eye"} /></button>
        </div>
        {help && <p className="field-help" id={`${name}-help`}>{help}</p>}
      </div>;
    })}
    <div aria-live="polite" role="status" className="password-status">{state.status === "success" && <p className="password-ok"><Icon name="check" />{state.message}</p>}</div>
    {state.status === "error" && <p className="alert" role="alert" id="password-feedback"><Icon name="alert" />{state.message}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Cambiando…" : "Cambiar contraseña"}</button>
  </form>;
}
