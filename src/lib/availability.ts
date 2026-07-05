import { and, eq, gt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  availabilityOverrides,
  availabilityRules,
} from "@/db/schema";
import { computeAvailableSlots } from "@/lib/slots";
import { getCanonicalDoctorProfile } from "@/lib/doctor";

/**
 * Computes upcoming available slots for the (single, v1) doctor in the
 * window [from, to). Returns an empty slot list and a null timezone if no
 * doctor profile has been created yet.
 */
export async function getAvailableSlots(
  from: Date,
  to: Date
): Promise<{ slots: Date[]; timezone: string | null }> {
  const profile = await getCanonicalDoctorProfile();

  if (!profile) {
    return { slots: [], timezone: null };
  }

  const [rules, overrides, busyAppointments] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id)),
    db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.doctorId, profile.id)),
    db
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, profile.id),
          ne(appointments.status, "cancelled"),
          or(
            ne(appointments.status, "pending_payment"),
            gt(appointments.holdExpiresAt, new Date())
          )
        )
      ),
  ]);

  const slots = computeAvailableSlots({
    rules,
    overrides,
    busy: busyAppointments.map((appointment) => ({
      start: appointment.startsAt,
      end: appointment.endsAt,
    })),
    slotMinutes: profile.slotMinutes,
    timezone: profile.timezone,
    from,
    to,
  });

  return { slots, timezone: profile.timezone };
}
