import { NextResponse } from "next/server";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doctorProfiles, user } from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";

const LOOKAHEAD_MINUTES = 15;

/**
 * The doctor's imminent consult, if any: a confirmed appointment starting
 * within the next 15 minutes (or currently running). Powers the app-wide
 * reminder banner.
 */
export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const [profile] = await db
    .select({ id: doctorProfiles.id })
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, access.id));

  if (!profile) return NextResponse.json(null);

  const now = new Date();
  const horizon = new Date(now.getTime() + LOOKAHEAD_MINUTES * 60 * 1000);

  const [row] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      patientName: user.name,
      patientEmail: user.email,
    })
    .from(appointments)
    .innerJoin(user, eq(user.id, appointments.patientId))
    .where(
      and(
        eq(appointments.doctorId, profile.id),
        eq(appointments.status, "confirmed"),
        lt(appointments.startsAt, horizon),
        gt(appointments.endsAt, now)
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(1);

  return NextResponse.json(row ?? null);
}
