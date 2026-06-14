import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/api-auth";
import { listDoctorPatients } from "@/lib/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";

export async function GET(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const query = new URL(request.url).searchParams.get("q") ?? undefined;

  return NextResponse.json({
    patients: await listDoctorPatients(profile.id, query),
    timezone: profile.timezone,
  });
}
