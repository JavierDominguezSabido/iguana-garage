import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Archivo de 10 MiB + envoltura multipart. El Route Handler sigue acotando ambos.
    proxyClientMaxBodySize: 10 * 1024 * 1024 + 64_000,
  },
  images: {
    deviceSizes: [320, 390, 640, 768, 1600],
    imageSizes: [],
    // Impide convertir nuestras imágenes revocables en copias cacheadas en /_next/image.
    localPatterns: [{ pathname: "/_next/static/media/**", search: "" }],
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
      ] },
      { source: "/login", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/app/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/portfolio/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
