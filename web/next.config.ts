import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig, updateInitialEnv } from "@next/env";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// The Next app lives in web/, but the repo keeps ONE .env at the root, shared
// with backend/, realtime/, and the tsx scripts. Next only auto-loads .env
// from its own project directory (web/), so load the root one explicitly.
//
// Resolved from this file's location rather than cwd, so it works whether you
// run `npm run dev` from the repo root or `next dev` from inside web/.
// `forceReload` is required: Next has already run loadEnvConfig for web/ by
// the time this config is evaluated, and the loader caches the first result.
// `updateInitialEnv` then folds the vars into the snapshot Next hands to the
// workers it forks for page-data collection.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { combinedEnv } = loadEnvConfig(
  repoRoot,
  process.env.NODE_ENV !== "production",
  console,
  true
);
updateInitialEnv(combinedEnv);

// Where the standalone backend (`npm run backend`) is reachable, e.g.
// http://localhost:4100 in dev or the Cloud Run URL in prod. When set, the
// endpoints that backend serves are proxied to it; when unset, they're handled
// in-process by the route files in web/app/api. Nothing else changes either
// way — the handlers are the same functions (see backend/api/http.ts).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN?.replace(/\/$/, "");

// Read as JSON rather than imported: next.config.ts is loaded outside the Next
// project's module graph, so it can't resolve a TypeScript import reaching into
// backend/. backend/api/routes.ts is the typed view of these same bytes.
const BACKEND_ROUTE_PATHS: string[] = [
  ...new Set(
    (
      JSON.parse(
        readFileSync(resolve(repoRoot, "backend/api/routes.json"), "utf8")
      ) as { routes: { method: string; path: string }[] }
    ).routes.map((route) => route.path)
  ),
];

const nextConfig: NextConfig = {
  // Container deploys (Cloud Run) run the traced standalone bundle rather than
  // `next start` over a full node_modules. Harmless locally — `npm run build`
  // still produces a normal .next alongside it.
  output: "standalone",
  // The app imports from backend/, which lives outside web/. Without this,
  // dependency tracing roots at web/ and misses those files.
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["pino", "pino-pretty"],

  /**
   * Proxies the migrated endpoints to the standalone backend.
   *
   * `beforeFiles` is required — it runs before the filesystem lookup, so the
   * rewrite wins over the matching `web/app/api/**\/route.ts` file.
   *
   * Proxying (rather than pointing the browser straight at the backend origin)
   * keeps every request same-origin, so session cookies keep working untouched
   * and no CORS or SameSite=None configuration is needed. Client code keeps
   * calling relative `/api/...` URLs and never learns the backend moved.
   */
  async rewrites() {
    if (!BACKEND_ORIGIN) return [];

    return {
      beforeFiles: BACKEND_ROUTE_PATHS.map((path) => ({
        source: path,
        destination: `${BACKEND_ORIGIN}${path}`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },

  // Dev-only cross-device testing: phone/browser may open the LAN URL while
  // the dev server was started on localhost. These are host patterns, not URLs.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
    "192.168.*.*",
  ],
};

export default nextConfig;
