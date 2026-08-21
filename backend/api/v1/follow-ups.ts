import { z } from "zod";
import { requireDoctorSession, requireSession } from "~backend/auth/api-auth";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { createFollowUp, setFollowUpStatus } from "~backend/care/follow-ups";
import type { ApiHandler } from "../http";

const createSchema = z.object({
  appointmentId: z.string().uuid(),
  inDays: z.number().int().min(1).max(365),
});

const statusSchema = z.object({ status: z.enum(["booked", "dismissed"]) });

/** POST /api/v1/follow-ups — doctor recommends a follow-up from a visit. */
export const createFollowUpHandler: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);
  const created = await createFollowUp({
    doctorId: profile.id,
    sourceAppointmentId: parsed.data.appointmentId,
    inDays: parsed.data.inDays,
  });
  if (!created) {
    return Response.json({ error: "Appointment not found" }, { status: 404 });
  }
  return Response.json({ followUp: created }, { status: 201 });
};

/**
 * PATCH /api/v1/follow-ups/:id — patient acknowledges (booked) or dismisses a
 * recommended follow-up.
 */
export const updateFollowUpStatus: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const updated = await setFollowUpStatus(params.id, access.id, parsed.data.status);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ followUp: updated });
};
