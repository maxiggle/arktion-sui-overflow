import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        // MangaDex cover art CDN
        protocol: "https",
        hostname: "uploads.mangadex.org",
        pathname: "/covers/**",
      },
      {
        // MangaDex chapter page CDN
        protocol: "https",
        hostname: "*.mangadex.network",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
