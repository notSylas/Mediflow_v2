// Pure MediFlow Care subscription decisions, kept free of DB access so they can
// be unit-tested directly. The data layer (care-subscription.ts) reads rows and
// delegates the *decisions* here. Mirrors the chat-policy.ts / chat.ts split.

// One follow-up credit is granted per active period.
export const FOLLOW_UP_CREDITS_PER_PERIOD = 1;

export interface SubscriptionState {
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  followUpCreditsUsed: number;
}

// Statuses that count as a live, paying-equivalent subscription. manual_trial is
// the v1 admin-granted trial; both unlock care features.
const ACTIVE_STATUSES = new Set(["active", "manual_trial"]);

/**
 * True when the subscription is in an active status AND `now` falls within its
 * current period. A status of "active" with an elapsed period is treated as
 * inactive until the period-roll job advances (or an admin re-activates) it.
 */
export function isSubscriptionActive(
  sub: SubscriptionState | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sub) return false;
  if (!ACTIVE_STATUSES.has(sub.status)) return false;
  if (!sub.currentPeriodStart || !sub.currentPeriodEnd) return false;
  return now >= sub.currentPeriodStart && now <= sub.currentPeriodEnd;
}

/**
 * True when the subscriber still has an unused follow-up credit this period.
 * Only meaningful for an active subscription — callers should gate on
 * isSubscriptionActive first.
 */
export function followUpAvailable(
  sub: SubscriptionState | null | undefined
): boolean {
  if (!sub) return false;
  return sub.followUpCreditsUsed < FOLLOW_UP_CREDITS_PER_PERIOD;
}

/** A period that has fully elapsed relative to `now` and should be rolled. */
export function periodHasElapsed(
  sub: Pick<SubscriptionState, "currentPeriodEnd">,
  now: Date = new Date()
): boolean {
  return !!sub.currentPeriodEnd && now > sub.currentPeriodEnd;
}

/** The end of a one-month care period starting at `start`. */
export function periodEndFrom(start: Date): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
}

/** Working days quoted for any eligible refund to land. */
export const REFUND_WORKING_DAYS = 7;

export interface CancellationBreakdown {
  pricePaise: number;
  /** Days of the current period already used (non-refundable). */
  usedDays: number;
  totalDays: number;
  remainingDays: number;
  /** Charged for the portion already used. */
  deductionPaise: number;
  /** Pro-rated refund for the unused remainder of the paid period. */
  refundPaise: number;
  refundWorkingDays: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Pro-rated cancellation breakdown for a monthly care plan. The portion of the
 * current period already used is non-refundable; the unused remainder is
 * refunded. Pure + deterministic so it can be shown identically on the
 * confirmation screen and computed server-side. Mirrors the consultation
 * cancellation breakdown's "deduction vs refund" framing.
 */
export function computeCancellationBreakdown(
  sub: SubscriptionState | null | undefined,
  pricePaise: number,
  now: Date = new Date()
): CancellationBreakdown {
  const zero: CancellationBreakdown = {
    pricePaise,
    usedDays: 0,
    totalDays: 0,
    remainingDays: 0,
    deductionPaise: pricePaise,
    refundPaise: 0,
    refundWorkingDays: REFUND_WORKING_DAYS,
  };
  if (!sub?.currentPeriodStart || !sub.currentPeriodEnd) return zero;

  const totalMs = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime();
  if (totalMs <= 0) return zero;

  const usedMs = Math.min(
    Math.max(now.getTime() - sub.currentPeriodStart.getTime(), 0),
    totalMs
  );
  const totalDays = Math.round(totalMs / MS_PER_DAY);
  const usedDays = Math.floor(usedMs / MS_PER_DAY);
  const remainingDays = Math.max(totalDays - usedDays, 0);

  const refundPaise = Math.round(pricePaise * (remainingMs(totalMs, usedMs)));
  return {
    pricePaise,
    usedDays,
    totalDays,
    remainingDays,
    deductionPaise: pricePaise - refundPaise,
    refundPaise,
    refundWorkingDays: REFUND_WORKING_DAYS,
  };
}

/** Fraction of the period still unused, clamped to [0, 1]. */
function remainingMs(totalMs: number, usedMs: number): number {
  return Math.min(Math.max((totalMs - usedMs) / totalMs, 0), 1);
}
