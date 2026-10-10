"use client";
import Image from "next/image";
import type { CSSProperties } from "react";
import { privateImageLoader } from "./image-loader";

// Foto privada con variantes preparadas (privateImageLoader). Es cliente porque el loader es una función y los
// componentes de servidor (p. ej. la tarjeta del listado) no pueden pasarla a next/image.
export function PrivatePhoto({ alt, ...props }: { src: string; sizes: string; width: number; height: number; alt: string; className?: string; style?: CSSProperties }) {
  return <Image loader={privateImageLoader} alt={alt} {...props} />;
}
