import { requireSession } from "~backend/auth/api-auth";
import { signRealtimeToken } from "~backend/messaging/realtime-token";
import type { ApiHandler } from "../http";

/**
 * GET /api/v1/realtime/token — issues a short-lived token the client presents
 * to the socket server.
 */
export const getRealtimeToken: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const token = signRealtimeToken({
    userId: access.id,
    role: access.role === "doctor" ? "doctor" : "patient",
  });

  return Response.json({
    token,
    url: process.env.NEXT_PUBLIC_REALTIME_URL ?? null,
  });
};
