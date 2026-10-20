import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The dev badge sits on top of the sidebar's account row.
  devIndicators: false,
  transpilePackages: ["@rc/core"],
  // The browser only talks to this origin; /api is proxied to Express so auth
  // cookies stay first-party (plan §14).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
