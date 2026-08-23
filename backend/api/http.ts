/**
 * The HTTP layer's one contract.
 *
 * Every endpoint is written once, here in `backend/api/`, as a plain
 * `(Request, ApiContext) => Response` function. Both transports mount the
 * same function:
 *
 *   - the Next.js app router, via `nextRoute()` below — `src/app/api/**`
 *     route files are one-line re-exports and hold no logic;
 *   - the standalone Hono server, via the adapter in `backend/server/app.ts`.
 *
 * That's what keeps the two API surfaces from drifting while the migration
 * to the standalone backend is in progress. Nothing in `backend/` imports a
 * web framework.
 */

/** Dynamic path segments, already resolved (`/appointments/:id` → `{ id }`). */
export interface ApiContext {
  params: Record<string, string>;
}

export type ApiHandler = (
  request: Request,
  ctx: ApiContext
) => Promise<Response>;

/**
 * Adapts a handler to a Next.js App Router route export.
 *
 * Next 15+ passes dynamic params as a promise, and omits the second argument
 * entirely for static routes — both are normalised away here so handlers see
 * a plain object.
 */
export function nextRoute(handler: ApiHandler) {
  return async (
    request: Request,
    ctx?: { params: Promise<Record<string, string>> }
  ): Promise<Response> => handler(request, { params: ctx ? await ctx.params : {} });
}

/**
 * The origin a link in a response body should point back at — never
 * `new URL(request.url).origin` alone, which behind a reverse proxy (Caddy
 * on LAN, Cloud Run's load balancer) resolves to the internal upstream
 * address (e.g. `http://app:3000`), not whatever the browser/phone actually
 * used to reach it. Reverse proxies set `X-Forwarded-Proto`/`-Host` (Caddy's
 * `reverse_proxy` does this by default; Cloud Run's LB sets Proto and
 * preserves the real `Host` header) — prefer those, fall back to the raw
 * request URL for the no-proxy case (`next dev`/`npm run backend` direct).
 */
export function resolveOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (proto && host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
