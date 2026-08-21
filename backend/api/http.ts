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
