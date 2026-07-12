import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/people/doctor";
import { createAsyncConsult } from "@/lib/booking/appointments";
import { getDoctorRefillRequest, setRefillRequestStatus } from "@/lib/care/refills";

/** Doctor fulfils a refill request: opens an async consult to prescribe in. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);
  const req = await getDoctorRefillRequest(id, profile.id);
  if (!req || req.status !== "pending") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const consult = await createAsyncConsult({
    doctorId: profile.id,
    patientId: req.patientId,
    visitReason: "Refill request",
    intakeNote: "Patient requested a refill of a previous prescription.",
  });
  await setRefillRequestStatus(id, "fulfilled");
  return NextResponse.json({ appointmentId: consult.id }, { status: 201 });
}
