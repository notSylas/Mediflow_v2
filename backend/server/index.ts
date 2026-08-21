// Standalone backend server — the API, split out of the Next.js app so it's
// independently deployable (its own Cloud Run service). Run alongside the
// web app and realtime server: `npm run backend`.
import { serve } from "@hono/node-server";
import app from "./app";

// Cloud Run injects PORT and expects the container to bind it.
const PORT = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4100);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[backend] listening on :${info.port}`);
});
