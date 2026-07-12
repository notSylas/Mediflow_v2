import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getAvailableSlots } from "@/lib/availability";

const DEFAULT_WINDOW_DAYS = 14;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
  }

  const { slots, timezone } = await getAvailableSlots(from, to);

  return NextResponse.json({
    slots: slots.map((slot) => slot.toISOString()),
    timezone,
  });
}
