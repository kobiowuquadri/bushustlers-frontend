import type { NextConfig } from "next";

// The browser only ever talks to this origin. /api/v1/* is proxied to the Express backend, so the backend's
// HttpOnly session cookies are first-party and no backend credentials or URLs are needed in browser code.
// BACKEND_URL is read at build time (rewrites are compiled into the build).
const backendUrl = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Cache Components / Partial Prefetching (template defaults) are off: in 16.4.5 their client-resume path
  // failed for the client-rendered dynamic routes (/pay/[linkId], /dashboard/orders/[id]) in production builds.
  // Dynamic routes render on demand instead; the landing page revalidates pricing hourly.
  poweredByHeader: false,
  // Brand images are already web-optimised; this avoids depending on sharp at runtime
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
