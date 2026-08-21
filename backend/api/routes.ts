import routesJson from "./routes.json";

/**
 * The endpoints the standalone backend serves — the single source of truth,
 * read from three places:
 *
 *   - `backend/api/manifest.ts` pairs each entry with its handler, and throws
 *     at startup if an entry has no handler or a handler has no entry;
 *   - `backend/server/app.ts` mounts them on the Hono server;
 *   - `web/next.config.ts` turns them into rewrites when `BACKEND_ORIGIN` is
 *     set, so the web app's `/api/*` calls reach the backend service.
 *
 * The data lives in `routes.json` rather than here because `next.config.ts` is
 * loaded outside the Next project's module graph and can't resolve a TypeScript
 * import from `backend/`; it reads the JSON directly. This file is the typed
 * view of the same bytes.
 *
 * `:param` segments mean the same thing in Hono and in Next.js rewrites, so one
 * pattern serves both.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface BackendRoute {
  method: HttpMethod;
  path: string;
}

export const BACKEND_ROUTES = routesJson.routes as readonly BackendRoute[];

/**
 * Distinct path patterns (a path appears once per method above). Rewrites are
 * per-path, not per-method.
 *
 * `/api/auth/*` is deliberately absent: the Hono server mounts Better Auth so
 * it can stand alone, but the web app keeps issuing its own session cookies
 * in-process. Moving the auth mount is a separate, riskier step.
 */
export const BACKEND_ROUTE_PATHS: readonly string[] = [
  ...new Set(BACKEND_ROUTES.map((route) => route.path)),
];
