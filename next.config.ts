import type { NextConfig } from "next";

// The browser only talks to this app; /api/* is forwarded to the NestJS backend so the auth
// cookie stays first-party. Route handlers under src/app/api (Blob upload) are matched first.
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
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
