import { auth, type Session } from "~backend/auth/auth";

/**
 * Resolves the session for an API route, requiring only that the caller is
 * authenticated (any role). Returns a `Response` to short-circuit with on
 * failure — callers narrow with `if (access instanceof Response) return access`.
 *
 * Takes `Headers` explicitly (rather than reading `next/headers` itself) and
 * returns a plain `Response`, so this is callable from any HTTP server. No
 * framework types appear anywhere in `backend/`.
 */
export async function requireSession(
  headers: Headers
): Promise<Session["user"] | Response> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session.user;
}

/**
 * Resolves the session for an API route and enforces that the caller is
 * a doctor. Returns a `Response` to short-circuit with on failure.
 */
export async function requireDoctorSession(
  headers: Headers
): Promise<Session["user"] | Response> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "doctor") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return session.user;
}

/**
 * Resolves the session for an API route and enforces that the caller is
 * an admin. Returns a `Response` to short-circuit with on failure. There is
 * no self-service path to this role — see scripts/promote-admin.ts.
 */
export async function requireAdminSession(
  headers: Headers
): Promise<Session["user"] | Response> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return session.user;
}
