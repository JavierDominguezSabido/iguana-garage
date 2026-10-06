import type { CSSProperties } from "react";
export function Icon({ name, style }: { name: "plus" | "arrow" | "photo" | "exit" | "close" | "trash" | "eye"; style?: CSSProperties }) {
  const paths = { plus: "M12 5v14M5 12h14", arrow: "m14 5-7 7 7 7M7 12h13", photo: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M16 8h.01", exit: "M10 4H4v16h6M10 12h11m-4-4 4 4-4 4", close: "m6 6 12 12M6 18 18 6", trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7", eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6" };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
