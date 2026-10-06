"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
export function DeleteButton({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/app/api/jobs/${id}`, { method: "DELETE" });
      let result;
      try { result = await response.json(); }
      catch { throw new Error("La sesión ha terminado o no se pudo conectar. Vuelve a entrar y reintenta."); }
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar");
      dialog.current?.close(); router.replace("/app"); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo eliminar. Reintenta."); setBusy(false); }
  }
  return <><button className="button destructive-link" onClick={() => dialog.current?.showModal()}><Icon name="trash" />Eliminar trabajo</button><dialog className="confirm-dialog" ref={dialog} aria-labelledby="delete-title" onCancel={(event) => { if (busy) event.preventDefault(); }}><div className="danger-icon"><Icon name="trash" /></div><h2 id="delete-title">¿Eliminar este trabajo?</h2><p><strong>{name}</strong></p><p className="muted">Se eliminarán el trabajo y sus fotografías. Esta acción no se puede deshacer.</p>{error && <p className="alert" role="alert">{error}</p>}<div className="confirm-actions"><button className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</button><button className="button danger" disabled={busy} onClick={remove}>{busy ? "Eliminando fotografías…" : "Sí, eliminar trabajo"}</button></div></dialog></>;
}
