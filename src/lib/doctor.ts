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
