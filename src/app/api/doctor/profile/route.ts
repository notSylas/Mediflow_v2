import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { doctorProfiles } from "@/db/schema";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { requireDoctorSession } from "@/lib/api-auth";

const updateProfileSchema = z.object({
  specialty: z.string().trim().min(1).max(200).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  feeInPaise: z.number().int().positive().optional(),
  slotMinutes: z.number().int().positive().max(240).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
});

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const json = await request.json();
  const parsed = updateProfileSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await getOrCreateDoctorProfile(access.id);

  const [updated] = await db
    .update(doctorProfiles)
    .set(parsed.data)
    .where(eq(doctorProfiles.userId, access.id))
    .returning();

  return NextResponse.json(updated);
}
