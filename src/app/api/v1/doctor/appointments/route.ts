import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { listDoctorAppointments } from "@/lib/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  return NextResponse.json({
    appointments: await listDoctorAppointments(profile.id),
    timezone: profile.timezone,
  });
}
