import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { createAsyncConsult } from "@/lib/appointments";

const schema = z.object({
  patientId: z.string().min(1),
  visitReason: z.string().trim().max(200).optional(),
});

/** Doctor starts an async (no-video) consult to prescribe a follow-up/refill. */
export async function POST(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);
  const created = await createAsyncConsult({
    doctorId: profile.id,
    patientId: parsed.data.patientId,
    visitReason: parsed.data.visitReason ?? "Follow-up consult",
  });
  return NextResponse.json({ appointmentId: created.id }, { status: 201 });
}
