// Envío JSON/FormData a los Route Handlers privados. Errores en español, sin datos sensibles.
export async function send(url: string, method: string, body?: unknown) {
  let response;
  try { response = await fetch(url, { method, ...(body instanceof FormData ? { body } : body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}) }); }
  catch { throw new Error("No hay conexión. Conserva el formulario y reintenta."); }
  let result: { error?: string }; try { result = await response.json(); } catch { throw new Error("La sesión ha terminado o no hay conexión. Reintenta."); }
  if (!response.ok) throw new Error(result.error || "No se pudo completar la operación");
}
