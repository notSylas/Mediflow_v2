import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { listPendingRefillRequests } from "@/lib/refills";

/** Pending refill requests the doctor needs to act on. */
export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const requests = await listPendingRefillRequests(profile.id);
  return NextResponse.json({ requests });
}
