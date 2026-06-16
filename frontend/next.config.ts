import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploads.mangadex.org",
        pathname: "/covers/**",
      },
      {
        protocol: "https",
        hostname: "*.mangadex.network",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "aggregator.walrus-testnet.walrus.space",
        pathname: "/v1/**",
      },
    ],
  },
};

export default nextConfig;
