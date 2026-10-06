import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [390, 640, 768, 1024, 1440, 1600],
    imageSizes: [160, 320],
    // Impide convertir nuestras imágenes revocables en copias cacheadas en /_next/image.
    localPatterns: [{ pathname: "/_next/static/media/**", search: "" }],
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: "/login", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/app/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/portfolio/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
