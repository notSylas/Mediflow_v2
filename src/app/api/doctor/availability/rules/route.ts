import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { availabilityRules } from "@/db/schema";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { requireDoctorSession } from "@/lib/auth/api-auth";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Invalid time, expected HH:MM");

const createRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.doctorId, profile.id))
    .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime));

  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const json = await request.json();
  const parsed = createRuleSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);

  const [created] = await db
    .insert(availabilityRules)
    .values({
      doctorId: profile.id,
      weekday: parsed.data.weekday,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
