import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listPatientPrescriptions } from "@/lib/consult";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";

export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const [prescriptions, profile, doctor] = await Promise.all([
    listPatientPrescriptions(access.id),
    getDoctorProfile(),
    getDoctorCard(),
  ]);

  return NextResponse.json({
    prescriptions,
    doctor,
    timezone: profile?.timezone ?? "Asia/Kolkata",
  });
}
