import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { availabilityOverrides } from "@/db/schema";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { requireDoctorSession } from "@/lib/auth/api-auth";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Invalid time, expected HH:MM");

const createOverrideSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date, expected YYYY-MM-DD"),
    kind: z.enum(["blocked", "extra"]),
    startTime: timeSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    reason: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (data) => {
      const start = data.startTime ?? null;
      const end = data.endTime ?? null;

      if (data.kind === "extra") {
        return start !== null && end !== null && start < end;
      }

      // "blocked": either a full-day block (no times) or a partial range.
      if (start === null && end === null) return true;
      if (start !== null && end !== null) return start < end;
      return false;
    },
    {
      message:
        "An 'extra' override requires startTime < endTime; a 'blocked' override must omit both times (full day) or provide startTime < endTime",
      path: ["endTime"],
    }
  );

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);

  const overrides = await db
    .select()
    .from(availabilityOverrides)
    .where(eq(availabilityOverrides.doctorId, profile.id))
    .orderBy(asc(availabilityOverrides.date));

  return NextResponse.json(overrides);
}

export async function POST(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const json = await request.json();
  const parsed = createOverrideSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);

  const [created] = await db
    .insert(availabilityOverrides)
    .values({
      doctorId: profile.id,
      date: parsed.data.date,
      kind: parsed.data.kind,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      reason: parsed.data.reason ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
