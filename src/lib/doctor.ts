import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doctorProfiles, payments, user } from "@/db/schema";

/** Public doctor info for patient-facing cards (name + profile). */
export async function getDoctorCard() {
  const [row] = await db
    .select({
      name: user.name,
      specialty: doctorProfiles.specialty,
      bio: doctorProfiles.bio,
      photoUrl: doctorProfiles.photoUrl,
      qualifications: doctorProfiles.qualifications,
      registrationNo: doctorProfiles.registrationNo,
      yearsExperience: doctorProfiles.yearsExperience,
      languages: doctorProfiles.languages,
      feeInPaise: doctorProfiles.feeInPaise,
      slotMinutes: doctorProfiles.slotMinutes,
    })
    .from(doctorProfiles)
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .limit(1);
  return row ?? null;
}

/** Total collected (paid) consultation fees for a doctor, in paise. */
export async function getDoctorRevenueInPaise(doctorProfileId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountInPaise}), 0)` })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .where(
      and(eq(appointments.doctorId, doctorProfileId), eq(payments.status, "paid"))
    );

  return Number(row?.total ?? 0);
}

/** Paid earnings bucketed into today / this week (Mon) / this month / all-time. */
export async function getDoctorEarnings(doctorProfileId: string) {
  const rows = await db
    .select({ amount: payments.amountInPaise, at: payments.updatedAt })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .where(
      and(eq(appointments.doctorId, doctorProfileId), eq(payments.status, "paid"))
    );

  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startWeek = startToday - (((now.getDay() + 6) % 7) * 86_400_000);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const earnings = { today: 0, week: 0, month: 0, total: 0 };
  for (const row of rows) {
    const at = new Date(row.at).getTime();
    earnings.total += row.amount;
    if (at >= startToday) earnings.today += row.amount;
    if (at >= startWeek) earnings.week += row.amount;
    if (at >= startMonth) earnings.month += row.amount;
  }
  return earnings;
}

/** Payment operational stats for the doctor dashboard. */
export async function getDoctorPaymentStats(doctorProfileId: string) {
  const rows = await db
    .select({ status: payments.status, amount: payments.amountInPaise })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .where(eq(appointments.doctorId, doctorProfileId));

  const stats = {
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    refundedCount: 0,
    paidAmountInPaise: 0,
    pendingAmountInPaise: 0,
    refundedAmountInPaise: 0,
  };

  for (const row of rows) {
    if (row.status === "paid") {
      stats.paidCount += 1;
      stats.paidAmountInPaise += row.amount;
    } else if (row.status === "created") {
      stats.pendingCount += 1;
      stats.pendingAmountInPaise += row.amount;
    } else if (row.status === "failed") {
      stats.failedCount += 1;
    } else if (row.status === "refunded") {
      stats.refundedCount += 1;
      stats.refundedAmountInPaise += row.amount;
    }
  }

  return stats;
}

const DEFAULT_FEE_IN_PAISE = 50000;
const DEFAULT_SLOT_MINUTES = 20;
const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Returns the (single, v1) doctor's profile, or null if the doctor hasn't
 * set one up yet.
 */
export async function getDoctorProfile() {
  const [profile] = await db.select().from(doctorProfiles).limit(1);
  return profile ?? null;
}

/**
 * Returns the doctor_profiles row for this user, creating one with
 * defaults if it doesn't exist yet. This is the only "onboarding" step —
 * there's no separate doctor signup flow.
 */
export async function getOrCreateDoctorProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(doctorProfiles)
    .values({
      userId,
      feeInPaise: DEFAULT_FEE_IN_PAISE,
      slotMinutes: DEFAULT_SLOT_MINUTES,
      timezone: DEFAULT_TIMEZONE,
    })
    .returning();

  return created;
}
