import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { signRealtimeToken } from "@/lib/messaging/realtime-token";

/** Issues a short-lived token the client presents to the socket server. */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const token = signRealtimeToken({
    userId: access.id,
    role: access.role === "doctor" ? "doctor" : "patient",
  });

  return NextResponse.json({
    token,
    url: process.env.NEXT_PUBLIC_REALTIME_URL ?? null,
  });
}
