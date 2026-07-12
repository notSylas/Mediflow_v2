import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doctorProfiles, medicalReports } from "@/db/schema";
import { requireSession } from "@/lib/auth/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;

  const [report] = await db
    .select()
    .from(medicalReports)
    .where(eq(medicalReports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isPatient = report.patientId === access.id;
  let isAppointmentDoctor = false;

  if (!isPatient && access.role === "doctor" && report.appointmentId) {
    const [ownedAppointment] = await db
      .select({ doctorUserId: doctorProfiles.userId })
      .from(appointments)
      .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
      .where(eq(appointments.id, report.appointmentId));

    isAppointmentDoctor = ownedAppointment?.doctorUserId === access.id;
  }

  if (!isPatient && !isAppointmentDoctor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new Response(new Uint8Array(report.data), {
    headers: {
      "Content-Type": report.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(report.filename)}"`,
    },
  });
}
