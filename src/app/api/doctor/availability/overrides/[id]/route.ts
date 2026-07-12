import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { availabilityOverrides } from "@/db/schema";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { requireDoctorSession } from "@/lib/auth/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);

  const [deleted] = await db
    .delete(availabilityOverrides)
    .where(
      and(
        eq(availabilityOverrides.id, id),
        eq(availabilityOverrides.doctorId, profile.id)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
