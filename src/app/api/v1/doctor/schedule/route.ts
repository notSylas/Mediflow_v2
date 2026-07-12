import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { availabilityOverrides, availabilityRules } from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { listDoctorAppointments } from "@/lib/booking/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [rules, overrides, appointments] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime)),
    db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.doctorId, profile.id))
      .orderBy(asc(availabilityOverrides.date)),
    listDoctorAppointments(profile.id),
  ]);

  return NextResponse.json({
    rules,
    overrides,
    appointments,
    timezone: profile.timezone,
  });
}
