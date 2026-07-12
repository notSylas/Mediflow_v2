import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import {
  getEncounterData,
  getMedicineHistory,
  getPatientHistory,
} from "@/lib/consult/consult";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const encounter = await getEncounterData(id, access.id);
  if (!encounter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [profile, history, medicineHistory, patientProfile] = await Promise.all([
    getOrCreateDoctorProfile(access.id),
    getPatientHistory(encounter.patient.id, encounter.doctorProfileId, id),
    getMedicineHistory(encounter.patient.id, encounter.doctorProfileId),
    getPatientProfile(encounter.patient.id),
  ]);

  return NextResponse.json({
    encounter,
    history,
    medicineHistory,
    patientProfile,
    timezone: profile.timezone,
  });
}
