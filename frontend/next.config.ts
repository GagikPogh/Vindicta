import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.VERCEL ? "/_backend" : "http://localhost:8000");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
