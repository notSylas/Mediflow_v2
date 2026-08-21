import { eq } from "drizzle-orm";
import { db } from "~backend/db";
import { appointments } from "~backend/db/schema";
import { requireSession } from "~backend/auth/api-auth";
import { getAppointmentForParticipant } from "~backend/booking/appointments";
import { getJoinDenial, roomNameFor } from "~backend/video/call-window";
import {
  createVideoToken,
  isVideoConfigured,
  listRoomParticipantIdentities,
} from "~backend/video/video";
import type { ApiHandler } from "./http";

const DENIAL_MESSAGES = {
  not_confirmed: "This appointment isn't confirmed.",
  too_early: "The room opens 10 minutes before your appointment.",
  too_late: "This appointment's call window has ended.",
} as const;

/**
 * GET /api/appointments/:id/presence — is the *other* party of this
 * appointment currently in the video room?
 */
export const getPresence: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const room = appointment.videoRoom ?? roomNameFor(appointment.id);
  const identities = await listRoomParticipantIdentities(room);
  const otherPartyPresent = identities.some((identity) => identity !== access.id);

  return Response.json({ otherPartyPresent });
};

/** POST /api/appointments/:id/video-token — mints a LiveKit join token. */
export const mintVideoToken: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!isVideoConfigured()) {
    return Response.json(
      { error: "Video isn't configured on this server yet." },
      { status: 503 }
    );
  }

  const denial = getJoinDenial(appointment, new Date());
  if (denial) {
    return Response.json(
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

  return Response.json({ token, url: process.env.LIVEKIT_URL, room });
};
