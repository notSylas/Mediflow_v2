import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listPatientPrescriptions } from "@/lib/consult";
import { getDoctorProfile } from "@/lib/doctor";

export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const [prescriptions, profile] = await Promise.all([
    listPatientPrescriptions(access.id),
    getDoctorProfile(),
  ]);

  return NextResponse.json({
    prescriptions,
    timezone: profile?.timezone ?? "Asia/Kolkata",
  });
}
