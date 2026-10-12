import type { ReactNode } from "react";

// Texto nuevo pendiente de aprobación: se ve marcado hasta que el propietario lo apruebe o lo cambie.
export function Provisional({ children }: { children: ReactNode }) {
  return <span className="pub-prov">{children}<span className="pub-prov-mark" aria-hidden="true">[texto provisional]</span></span>;
}
