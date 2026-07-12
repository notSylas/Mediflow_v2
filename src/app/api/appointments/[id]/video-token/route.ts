import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireSession } from "@/lib/auth/api-auth";
import { getAppointmentForParticipant } from "@/lib/booking/appointments";
import { getJoinDenial, roomNameFor } from "@/lib/call-window";
import { createVideoToken, isVideoConfigured } from "@/lib/video";

const DENIAL_MESSAGES = {
  not_confirmed: "This appointment isn't confirmed.",
  too_early: "The room opens 10 minutes before your appointment.",
  too_late: "This appointment's call window has ended.",
} as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const appointment = await getAppointmentForParticipant(id, access);

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isVideoConfigured()) {
    return NextResponse.json(
      { error: "Video isn't configured on this server yet." },
      { status: 503 }
    );
  }

  const denial = getJoinDenial(appointment, new Date());
  if (denial) {
    return NextResponse.json(
      { error: DENIAL_MESSAGES[denial], reason: denial },
      { status: 403 }
    );
  }

  const room = appointment.videoRoom ?? roomNameFor(appointment.id);
  if (!appointment.videoRoom) {
    await db
      .update(appointments)
      .set({ videoRoom: room })
      .where(eq(appointments.id, appointment.id));
  }

  const token = await createVideoToken({
    room,
    identity: access.id,
    name: access.name,
  });

  return NextResponse.json({ token, url: process.env.LIVEKIT_URL, room });
}
