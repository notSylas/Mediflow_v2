import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getAppointmentForParticipant } from "@/lib/appointments";
import { roomNameFor } from "@/lib/call-window";
import { listRoomParticipantIdentities } from "@/lib/video";

/** Is the *other* party of this appointment currently in the video room? */
export async function GET(
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

  const room = appointment.videoRoom ?? roomNameFor(appointment.id);
  const identities = await listRoomParticipantIdentities(room);
  const otherPartyPresent = identities.some((identity) => identity !== access.id);

  return NextResponse.json({ otherPartyPresent });
}
