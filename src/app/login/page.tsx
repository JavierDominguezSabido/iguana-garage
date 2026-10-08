import {redirect} from "next/navigation";

// Compatibilidad con enlaces previos. El único formulario está dentro del scope PWA.
export default function LegacyLoginPage() {redirect("/app/login");}
