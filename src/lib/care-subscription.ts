import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  careFollowUpRequests,
  careSubscriptions,
  user,
} from "@/db/schema";
import {
  computeCancellationBreakdown,
  followUpAvailable,
  isSubscriptionActive,
  periodEndFrom,
  type SubscriptionState,
} from "@/lib/care-subscription-policy";
import { getCanonicalDoctorProfile } from "@/lib/doctor";

export type CareSubscription = typeof careSubscriptions.$inferSelect;

/** Fallback monthly price if no doctor profile exists yet (paise, ₹499). */
export const CARE_PLAN_PRICE_PAISE = 49900;

/** The single doctor's id + care-plan price (v1 is single-doctor; see chat.ts). */
async function soleDoctor(): Promise<{ id: string; priceInPaise: number } | null> {
  // Use the shared canonical resolver so the subscription is always bound to
  // the same doctor the messaging gate (chat.ts) and slots check against.
  const doctor = await getCanonicalDoctorProfile();
  return doctor
    ? { id: doctor.id, priceInPaise: doctor.carePlanPriceInPaise }
    : null;
}

async function soleDoctorId(): Promise<string | null> {
  return (await soleDoctor())?.id ?? null;
}

/** The patient's subscription row with the (single) doctor, or null. */
export async function getSubscription(
  patientId: string,
  doctorId?: string
): Promise<CareSubscription | null> {
  const dId = doctorId ?? (await soleDoctorId());
  if (!dId) return null;
  const [row] = await db
    .select()
    .from(careSubscriptions)
    .where(
      and(
        eq(careSubscriptions.patientId, patientId),
        eq(careSubscriptions.doctorId, dId)
      )
    );
  return row ?? null;
}

/** True when the patient has a live subscription with the doctor right now. */
export async function patientHasActiveSubscription(
  patientId: string,
  doctorId?: string
): Promise<boolean> {
  const sub = await getSubscription(patientId, doctorId);
  return isSubscriptionActive(sub);
}

interface PatientCareStatus {
  subscription: CareSubscription | null;
  active: boolean;
  followUpAvailable: boolean;
  doctorId: string | null;
  priceInPaise: number;
}

/** Everything the patient surfaces (home card, settings, checkout) need in one read. */
export async function getPatientCareStatus(
  patientId: string
): Promise<PatientCareStatus> {
  const doctor = await soleDoctor();
  const subscription = doctor
    ? await getSubscription(patientId, doctor.id)
    : null;
  const active = isSubscriptionActive(subscription);
  return {
    subscription,
    active,
    followUpAvailable: active && followUpAvailable(subscription),
    doctorId: doctor?.id ?? null,
    priceInPaise: doctor?.priceInPaise ?? CARE_PLAN_PRICE_PAISE,
  };
}

/**
 * Activates (or renews) a subscription for the patient↔doctor pair, opening a
 * fresh one-month period and resetting the follow-up credit. Used by both the
 * doctor/admin toggle and the patient's mock "Start care plan" action.
 * `status` lets the admin grant a manual trial vs. a normal activation.
 */
export async function activateSubscription(
  patientId: string,
  doctorId: string,
  status: "active" | "manual_trial" = "active",
  now: Date = new Date()
): Promise<CareSubscription> {
  const currentPeriodStart = now;
  const currentPeriodEnd = periodEndFrom(now);

  const [row] = await db
    .insert(careSubscriptions)
    .values({
      patientId,
      doctorId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      followUpCreditsUsed: 0,
      cancelledAt: null,
    })
    .onConflictDoUpdate({
      target: [careSubscriptions.patientId, careSubscriptions.doctorId],
      set: {
        status,
        currentPeriodStart,
        currentPeriodEnd,
        followUpCreditsUsed: 0,
        cancelledAt: null,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

/** Marks a subscription inactive or cancelled (admin toggle / patient cancel). */
export async function deactivateSubscription(
  patientId: string,
  doctorId: string,
  status: "inactive" | "cancelled" = "cancelled",
  now: Date = new Date()
): Promise<CareSubscription | null> {
  const [row] = await db
    .update(careSubscriptions)
    .set({
      status,
      cancelledAt: status === "cancelled" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(careSubscriptions.patientId, patientId),
        eq(careSubscriptions.doctorId, doctorId)
      )
    )
    .returning();
  return row ?? null;
}

/** Resets the follow-up credit for the current period (admin nicety). */
export async function resetFollowUpCredit(
  patientId: string,
  doctorId: string
): Promise<void> {
  await db
    .update(careSubscriptions)
    .set({ followUpCreditsUsed: 0, updatedAt: new Date() })
    .where(
      and(
        eq(careSubscriptions.patientId, patientId),
        eq(careSubscriptions.doctorId, doctorId)
      )
    );
}

/** Updates patient-controlled digest / reminder preferences. */
export async function updateCarePreferences(
  patientId: string,
  doctorId: string,
  prefs: { digestEnabled?: boolean; medicineRemindersEnabled?: boolean }
): Promise<CareSubscription | null> {
  const [row] = await db
    .update(careSubscriptions)
    .set({ ...prefs, updatedAt: new Date() })
    .where(
      and(
        eq(careSubscriptions.patientId, patientId),
        eq(careSubscriptions.doctorId, doctorId)
      )
    )
    .returning();
  return row ?? null;
}

export type RequestFollowUpResult =
  | { ok: true; request: typeof careFollowUpRequests.$inferSelect }
  | { ok: false; reason: "not_subscribed" | "no_credit" };

/**
 * Spends the patient's monthly follow-up credit and records the request. Atomic:
 * the credit increment and the request insert happen in one transaction, and the
 * increment is conditional on a credit still being free so two concurrent calls
 * can't both consume it.
 */
export async function requestFollowUp(
  patientId: string,
  note: string | null
): Promise<RequestFollowUpResult> {
  const sub = await getSubscription(patientId);
  if (!isSubscriptionActive(sub) || !sub) return { ok: false, reason: "not_subscribed" };
  if (!followUpAvailable(sub)) return { ok: false, reason: "no_credit" };

  return db.transaction(async (tx) => {
    // Conditional increment: only succeeds if a credit is still free, guarding
    // against a concurrent second request consuming the same credit.
    const [updated] = await tx
      .update(careSubscriptions)
      .set({
        followUpCreditsUsed: sub.followUpCreditsUsed + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(careSubscriptions.id, sub.id),
          eq(careSubscriptions.followUpCreditsUsed, sub.followUpCreditsUsed)
        )
      )
      .returning();
    if (!updated) return { ok: false, reason: "no_credit" } as const;

    const [request] = await tx
      .insert(careFollowUpRequests)
      .values({
        subscriptionId: sub.id,
        patientId,
        doctorId: sub.doctorId,
        note,
        periodStart: sub.currentPeriodStart!,
      })
      .returning();
    return { ok: true, request } as const;
  });
}

/**
 * Rolls active subscriptions whose period has elapsed onto a fresh one-month
 * period and resets their follow-up credit. The v1 mock-billing clock — invoked
 * by the daily care cron. Returns the number of rows rolled.
 */
export async function rollElapsedPeriods(now: Date = new Date()): Promise<number> {
  const due = await db
    .select()
    .from(careSubscriptions)
    .where(
      and(
        inArray(careSubscriptions.status, ["active", "manual_trial"]),
        lt(careSubscriptions.currentPeriodEnd, now)
      )
    );

  for (const sub of due) {
    const start = now;
    await db
      .update(careSubscriptions)
      .set({
        currentPeriodStart: start,
        currentPeriodEnd: periodEndFrom(start),
        followUpCreditsUsed: 0,
        updatedAt: now,
      })
      .where(eq(careSubscriptions.id, sub.id));
  }
  return due.length;
}

// ---------------------------------------------------------------------------
// Doctor-side reads
// ---------------------------------------------------------------------------

/** Count of subscribers with a live subscription, for the doctor home. */
export async function countActiveSubscribers(doctorId: string): Promise<number> {
  const rows = await db
    .select({
      status: careSubscriptions.status,
      start: careSubscriptions.currentPeriodStart,
      end: careSubscriptions.currentPeriodEnd,
    })
    .from(careSubscriptions)
    .where(
      and(
        eq(careSubscriptions.doctorId, doctorId),
        inArray(careSubscriptions.status, ["active", "manual_trial"])
      )
    );
  const now = new Date();
  return rows.filter((r) =>
    isSubscriptionActive(
      {
        status: r.status,
        currentPeriodStart: r.start,
        currentPeriodEnd: r.end,
        followUpCreditsUsed: 0,
      },
      now
    )
  ).length;
}

/**
 * Set of patient ids with an active subscription to this doctor. Used to badge
 * patient lists and message threads without an N+1 per row.
 */
export async function getActiveSubscriberIds(
  doctorId: string
): Promise<Set<string>> {
  const subs = await listDoctorSubscribers(doctorId);
  return new Set(subs.filter((s) => s.active).map((s) => s.patientId));
}

export interface DoctorSubscriberRow {
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: string;
  active: boolean;
  followUpCreditsUsed: number;
  followUpAvailable: boolean;
  currentPeriodEnd: string | null;
  createdAt: string;
}

/**
 * All subscribers for the doctor (any status), for the care-management screen.
 * Active subscribers first, then by most recently created.
 */
export async function listDoctorSubscribers(
  doctorId: string
): Promise<DoctorSubscriberRow[]> {
  const rows = await db
    .select({
      patientId: careSubscriptions.patientId,
      patientName: user.name,
      patientEmail: user.email,
      status: careSubscriptions.status,
      currentPeriodStart: careSubscriptions.currentPeriodStart,
      currentPeriodEnd: careSubscriptions.currentPeriodEnd,
      followUpCreditsUsed: careSubscriptions.followUpCreditsUsed,
      createdAt: careSubscriptions.createdAt,
    })
    .from(careSubscriptions)
    .innerJoin(user, eq(user.id, careSubscriptions.patientId))
    .where(eq(careSubscriptions.doctorId, doctorId))
    .orderBy(desc(careSubscriptions.createdAt));

  return rows
    .map((r) => {
      const state = {
        status: r.status,
        currentPeriodStart: r.currentPeriodStart,
        currentPeriodEnd: r.currentPeriodEnd,
        followUpCreditsUsed: r.followUpCreditsUsed,
      };
      const active = isSubscriptionActive(state);
      return {
        patientId: r.patientId,
        patientName: r.patientName,
        patientEmail: r.patientEmail,
        status: r.status,
        active,
        followUpCreditsUsed: r.followUpCreditsUsed,
        followUpAvailable: active && followUpAvailable(state),
        currentPeriodEnd: r.currentPeriodEnd?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active));
}

export interface CareFollowUpRow {
  id: string;
  createdAt: Date;
  patientId: string;
  patientName: string;
  patientEmail: string;
  note: string | null;
}

/** Pending patient-initiated care follow-up requests, for the work queue. */
export async function listPendingCareFollowUps(
  doctorId: string
): Promise<CareFollowUpRow[]> {
  return db
    .select({
      id: careFollowUpRequests.id,
      createdAt: careFollowUpRequests.createdAt,
      patientId: careFollowUpRequests.patientId,
      patientName: user.name,
      patientEmail: user.email,
      note: careFollowUpRequests.note,
    })
    .from(careFollowUpRequests)
    .innerJoin(user, eq(user.id, careFollowUpRequests.patientId))
    .where(
      and(
        eq(careFollowUpRequests.doctorId, doctorId),
        eq(careFollowUpRequests.status, "pending")
      )
    )
    .orderBy(desc(careFollowUpRequests.createdAt));
}

/** Loads a pending care follow-up request that belongs to this doctor. */
export async function getDoctorCareFollowUp(id: string, doctorId: string) {
  const [row] = await db
    .select()
    .from(careFollowUpRequests)
    .where(
      and(eq(careFollowUpRequests.id, id), eq(careFollowUpRequests.doctorId, doctorId))
    );
  return row ?? null;
}

/** Marks a care follow-up request resolved, optionally linking its consult. */
export async function setCareFollowUpStatus(
  id: string,
  status: "booked" | "dismissed",
  appointmentId?: string
) {
  await db
    .update(careFollowUpRequests)
    .set({ status, ...(appointmentId ? { appointmentId } : {}) })
    .where(eq(careFollowUpRequests.id, id));
}

export interface DoctorPatientCareStatus {
  active: boolean;
  status: string;
  followUpAvailable: boolean;
  currentPeriodEnd: string | null;
}

/** Subscription summary the doctor sees on a patient's detail / list row. */
export async function getDoctorPatientCareStatus(
  patientId: string,
  doctorId: string
): Promise<DoctorPatientCareStatus> {
  const sub = await getSubscription(patientId, doctorId);
  const active = isSubscriptionActive(sub);
  return {
    active,
    status: sub?.status ?? "none",
    followUpAvailable: active && followUpAvailable(sub),
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
  };
}

export interface CareStatusDTO {
  active: boolean;
  status: string; // "active" | "inactive" | "cancelled" | "manual_trial" | "none"
  followUpAvailable: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  digestEnabled: boolean;
  medicineRemindersEnabled: boolean;
  priceInPaise: number;
}

/** Wire shape shared by web + mobile patient care surfaces. */
export function toCareStatusDTO(status: PatientCareStatus): CareStatusDTO {
  const sub = status.subscription;
  return {
    active: status.active,
    status: sub?.status ?? "none",
    followUpAvailable: status.followUpAvailable,
    currentPeriodStart: sub?.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    digestEnabled: sub?.digestEnabled ?? true,
    medicineRemindersEnabled: sub?.medicineRemindersEnabled ?? true,
    priceInPaise: status.priceInPaise,
  };
}

/** Cancellation breakdown for the patient's current plan (confirmation screen). */
export async function getCancellationBreakdown(patientId: string) {
  const status = await getPatientCareStatus(patientId);
  return computeCancellationBreakdown(status.subscription, status.priceInPaise);
}

// Re-export the pure helpers so callers have one import surface.
export {
  isSubscriptionActive,
  followUpAvailable,
  computeCancellationBreakdown,
};
export type { SubscriptionState };
