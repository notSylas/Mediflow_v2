import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth, type Session } from "@/lib/auth";

/**
 * Resolves the session for an API route, requiring only that the caller is
 * authenticated (any role). Returns a `NextResponse` to short-circuit with
 * on failure.
 */
export async function requireSession(): Promise<Session["user"] | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session.user;
}

/**
 * Resolves the session for an API route and enforces that the caller is
 * a doctor. Returns a `NextResponse` to short-circuit with on failure.
 */
export async function requireDoctorSession(): Promise<
  Session["user"] | NextResponse
> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session.user;
}
