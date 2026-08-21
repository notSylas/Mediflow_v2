import { Hono, type Context } from "hono";
import { auth } from "~backend/auth/auth";
import type { ApiHandler } from "~backend/api/http";
import { API_ROUTES } from "~backend/api/manifest";

/**
 * Mounts a shared handler from `backend/api/` — the same function the Next.js
 * route files export. This adapter is the only Hono-aware code in the request
 * path; the handlers themselves take a plain `Request`.
 */
const mount = (handler: ApiHandler) => (c: Context) =>
  handler(c.req.raw, { params: c.req.param() });

const app = new Hono();

// better-auth's core handler is already a plain
// (request: Request) => Promise<Response> — no Next.js-specific adapter
// needed, unlike the toNextJsHandler wrapper the web app's route used.
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

for (const route of API_ROUTES) {
  app.on(route.method, route.path, mount(route.handler));
}

// `/healthz` is intercepted by Google Frontend on *.run.app and never reaches
// the container, so `/health` is the alias that actually works on Cloud Run.
// Both are kept: /healthz for local and non-GCP hosts, /health everywhere.
const health = (c: Context) => c.text("backend ok");
app.get("/healthz", health);
app.get("/health", health);

export default app;
