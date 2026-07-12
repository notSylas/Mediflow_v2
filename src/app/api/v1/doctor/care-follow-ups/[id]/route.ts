import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { createAsyncConsult } from "@/lib/booking/appointments";
import {
  getDoctorCareFollowUp,
  setCareFollowUpStatus,
} from "@/lib/care/care-subscription";
import { getOrCreateDoctorProfile } from "@/lib/people/doctor";

const schema = z.object({ action: z.enum(["fulfill", "dismiss"]) });

/**
 * Doctor acts on a patient's care-plan follow-up request. "fulfill" opens an
 * async consult to review/prescribe in; "dismiss" closes it without one.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);
  const req = await getDoctorCareFollowUp(id, profile.id);
  if (!req || req.status !== "pending") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "dismiss") {
    await setCareFollowUpStatus(id, "dismissed");
    return NextResponse.json({ ok: true });
  }

  const consult = await createAsyncConsult({
    doctorId: profile.id,
    patientId: req.patientId,
    visitReason: "Care plan follow-up",
    intakeNote:
      req.note ?? "Patient requested their monthly MediFlow Care follow-up.",
  });
  await setCareFollowUpStatus(id, "booked", consult.id);
  return NextResponse.json({ appointmentId: consult.id }, { status: 201 });
}
