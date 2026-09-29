import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Production builds are a static export served by the FastAPI backend, which also
// serves /api on the same origin. Rewrites are unsupported in static exports, so
// only `next dev` proxies /api to a locally running backend.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // No trailingSlash here: it would redirect /api/x to /api/x/, which FastAPI doesn't route.
    return {
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
      },
    };
  }
  // trailingSlash exports pages as nda/index.html, which FastAPI's StaticFiles serves at /nda/.
  return { output: "export", trailingSlash: true };
}
