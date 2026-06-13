import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { availabilityRules } from "@/db/schema";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { requireDoctorSession } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);

  const [deleted] = await db
    .delete(availabilityRules)
    .where(
      and(eq(availabilityRules.id, id), eq(availabilityRules.doctorId, profile.id))
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
