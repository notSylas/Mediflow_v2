import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { getDoctorRefillRequest, setRefillRequestStatus } from "@/lib/refills";

/** Doctor declines a refill request. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);
  const req = await getDoctorRefillRequest(id, profile.id);
  if (!req || req.status !== "pending") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await setRefillRequestStatus(id, "declined");
  return NextResponse.json({ ok: true });
}
