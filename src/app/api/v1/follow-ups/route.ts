import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDoctorSession } from "@/lib/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { createFollowUp } from "@/lib/follow-ups";

const schema = z.object({
  appointmentId: z.string().uuid(),
  inDays: z.number().int().min(1).max(365),
});

/** Doctor recommends a follow-up from a visit. */
export async function POST(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);
  const created = await createFollowUp({
    doctorId: profile.id,
    sourceAppointmentId: parsed.data.appointmentId,
    inDays: parsed.data.inDays,
  });
  if (!created) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  return NextResponse.json({ followUp: created }, { status: 201 });
}
