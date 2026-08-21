import { auth } from "~backend/auth/auth";
import { getAvailableSlots } from "~backend/booking/availability";
import type { ApiHandler } from "./http";

const DEFAULT_WINDOW_DAYS = 14;

/** GET /api/slots?from=&to= — bookable slots in a window. */
export const getSlots: ApiHandler = async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();

  const from = searchParams.has("from")
    ? new Date(searchParams.get("from")!)
    : now;
  const to = searchParams.has("to")
    ? new Date(searchParams.get("to")!)
    : new Date(from.getTime() + DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return Response.json({ error: "Invalid from/to" }, { status: 400 });
  }

  const { slots, timezone } = await getAvailableSlots(from, to);

  return Response.json({
    slots: slots.map((slot) => slot.toISOString()),
    timezone,
  });
};
