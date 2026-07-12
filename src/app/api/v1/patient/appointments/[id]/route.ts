import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getAppointmentForPatient } from "@/lib/appointments";
import { canCancelAppointment } from "@/lib/booking";
import { getPrescriptionWithMedicines } from "@/lib/consult";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getAppointmentForPatient(id, access.id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [prescription, profile, doctor] = await Promise.all([
    getPrescriptionWithMedicines(id).then((value) =>
      value?.status === "issued" ? value : null
    ),
    getDoctorProfile(),
    getDoctorCard(),
  ]);

  return NextResponse.json({
    ...row,
    prescription,
    doctor,
    timezone: profile?.timezone ?? "Asia/Kolkata",
    canCancel: canCancelAppointment(row.appointment, new Date()),
  });
}
