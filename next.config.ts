import type { NextConfig } from "next";

// The browser only talks to this app; /api/* is forwarded to the NestJS backend so the auth
// cookie stays first-party. Route handlers under src/app/api (Blob upload) are matched first.
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  experimental: {
    // Requests forwarded to the backend are buffered; the default 10 MB cut off Excel uploads
    // in direct mode. On Vercel use NEXT_PUBLIC_UPLOAD_MODE=blob instead (4.5 MB function limit).
    proxyClientMaxBodySize: "200mb",
    // Default is 30 s; an AI answer with several tool calls can take longer.
    proxyTimeout: 120_000,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }],
      fallback: [],
    };
  },
};

export default nextConfig;
