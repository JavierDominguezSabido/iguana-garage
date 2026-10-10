import type { CSSProperties } from "react";

// Iconos de trazo de la gestión privada (24 × 24, trazo redondeado). Siempre decorativos: el nombre accesible lo da el control.
const paths = {
  plus: "M12 5v14M5 12h14",
  back: "M19 12H5m6-6-6 6 6 6",
  forward: "M5 12h14m-6-6 6 6-6 6",
  up: "M12 19V5m-6 6 6-6 6 6",
  down: "M12 5v14m6-6-6 6-6-6",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  photo: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM4 15.5l4.5-4.5 4 4 2.5-2.5 5 5M15.5 9h.01",
  grid: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  compare: "M4.5 5.5h15v13h-15zM12 3v18M10.2 12h3.6",
  exit: "M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l4-4-4-4M14 12H4",
  close: "m6 6 12 12M6 18 18 6",
  trash: "M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5m4-5v5",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5",
  hide: "M3 3l18 18M10.6 6.1q.7-.1 1.4-.1c6 0 9.5 6 9.5 6a16 16 0 0 1-2.9 3.5M6.5 6.6C4 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5q2.6 0 4.6-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  pencil: "M4.5 19.5h4l10.5-10.5-4-4L4.5 15.5zM13.5 6.5l4 4",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  check: "m5 12.5 4.5 4.5L19 7.5",
  alert: "M12 8.5v4.5M12 16.5h.01M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0",
  frame: "M8 4H5.5A1.5 1.5 0 0 0 4 5.5V8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M16 20h2.5a1.5 1.5 0 0 0 1.5-1.5V16M12 10v4M10 12h4",
  upload: "M12 15.5V4.5m-4.5 4.5L12 4.5 16.5 9M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15",
  expand: "M14.5 4.5h5v5M9.5 19.5h-5v-5M19.5 4.5 13.5 10.5M4.5 19.5l6-6",
} as const;
export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "grip" ? 3 : 1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}><path d={paths[name]} /></svg>;
}
