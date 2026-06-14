import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireDoctorSession } from "@/lib/api-auth";
import { listDoctorPatients } from "@/lib/appointments";
import { getMedicineHistory, getPatientHistory } from "@/lib/consult";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);
  const roster = await listDoctorPatients(profile.id);
  if (!roster.some(({ patient }) => patient.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [patient] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, id));
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [history, medicineHistory, patientProfile] = await Promise.all([
    getPatientHistory(id, profile.id),
    getMedicineHistory(id, profile.id),
    getPatientProfile(id),
  ]);

  return NextResponse.json({
    patient,
    patientProfile,
    history,
    medicineHistory,
    timezone: profile.timezone,
  });
}
