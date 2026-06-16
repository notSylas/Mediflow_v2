import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { availabilityRules, prescriptions } from "@/db/schema";
import { requireDoctorSession } from "@/lib/api-auth";
import { listDoctorAppointments } from "@/lib/appointments";
import {
  getDoctorEarnings,
  getDoctorPaymentStats,
  getDoctorRevenueInPaise,
  getOrCreateDoctorProfile,
} from "@/lib/doctor";
import { countDoctorPendingFollowUps } from "@/lib/follow-ups";
import { countPendingRefillRequests } from "@/lib/refills";

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [
    appointments,
    revenueInPaise,
    earnings,
    pendingFollowUps,
    pendingRefills,
    paymentStats,
    rules,
    issued,
  ] = await Promise.all([
    listDoctorAppointments(profile.id),
    getDoctorRevenueInPaise(profile.id),
    getDoctorEarnings(profile.id),
    countDoctorPendingFollowUps(profile.id),
    countPendingRefillRequests(profile.id),
    getDoctorPaymentStats(profile.id),
    db
      .select({ id: availabilityRules.id })
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .limit(1),
    db
      .select({ appointmentId: prescriptions.appointmentId })
      .from(prescriptions)
      .where(
        and(eq(prescriptions.doctorId, profile.id), eq(prescriptions.status, "issued"))
      ),
  ]);

  // Completed visits that don't yet have an issued prescription.
  const issuedSet = new Set(issued.map((r) => r.appointmentId));
  const awaitingPrescription = appointments.filter(
    (row) =>
      row.appointment.status === "completed" && !issuedSet.has(row.appointment.id)
  ).length;

  return NextResponse.json({
    appointments,
    profile,
    revenueInPaise,
    earnings,
    hasAvailability: rules.length > 0,
    awaitingPrescription,
    pendingFollowUps,
    pendingRefills,
    paymentStats,
  });
}
