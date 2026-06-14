import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { availabilityRules } from "@/db/schema";
import { requireDoctorSession } from "@/lib/api-auth";
import { listDoctorAppointments } from "@/lib/appointments";
import {
  getDoctorRevenueInPaise,
  getOrCreateDoctorProfile,
} from "@/lib/doctor";

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [appointments, revenueInPaise, rules] = await Promise.all([
    listDoctorAppointments(profile.id),
    getDoctorRevenueInPaise(profile.id),
    db
      .select({ id: availabilityRules.id })
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .limit(1),
  ]);

  return NextResponse.json({
    appointments,
    profile,
    revenueInPaise,
    hasAvailability: rules.length > 0,
  });
}
