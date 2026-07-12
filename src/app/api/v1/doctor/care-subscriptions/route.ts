import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { listDoctorSubscribers } from "@/lib/care-subscription";

/** Doctor's care-plan members + summary counts, for the care-management screen. */
export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const subscribers = await listDoctorSubscribers(profile.id);

  return NextResponse.json({
    subscribers,
    activeCount: subscribers.filter((s) => s.active).length,
    totalCount: subscribers.length,
  });
}
