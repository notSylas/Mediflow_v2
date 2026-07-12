import { describe, expect, it } from "vitest";
import {
  computeCancellationBreakdown,
  followUpAvailable,
  isSubscriptionActive,
  periodEndFrom,
  periodHasElapsed,
  type SubscriptionState,
} from "@/lib/care/care-subscription-policy";

const now = new Date("2026-06-15T12:00:00Z");

function sub(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    status: "active",
    currentPeriodStart: new Date("2026-06-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
    followUpCreditsUsed: 0,
    ...overrides,
  };
}

describe("isSubscriptionActive", () => {
  it("unlocks care messaging for an in-period active subscription", () => {
    expect(isSubscriptionActive(sub(), now)).toBe(true);
  });

  it("treats manual_trial as active", () => {
    expect(isSubscriptionActive(sub({ status: "manual_trial" }), now)).toBe(true);
  });

  it("blocks care messaging for inactive/cancelled statuses", () => {
    expect(isSubscriptionActive(sub({ status: "inactive" }), now)).toBe(false);
    expect(isSubscriptionActive(sub({ status: "cancelled" }), now)).toBe(false);
  });

  it("does not unlock care messaging without a subscription, even if a visit exists elsewhere", () => {
    expect(isSubscriptionActive(null, now)).toBe(false);
  });

  it("is inactive when the period has elapsed even if status is active", () => {
    const elapsed = sub({
      currentPeriodStart: new Date("2026-04-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
    });
    expect(isSubscriptionActive(elapsed, now)).toBe(false);
  });

  it("is inactive when there is no period or no subscription", () => {
    expect(isSubscriptionActive(sub({ currentPeriodEnd: null }), now)).toBe(false);
    expect(isSubscriptionActive(null, now)).toBe(false);
  });
});

describe("followUpAvailable", () => {
  it("is available when no credit used this period", () => {
    expect(followUpAvailable(sub({ followUpCreditsUsed: 0 }))).toBe(true);
  });

  it("is unavailable once the single monthly credit is consumed", () => {
    expect(followUpAvailable(sub({ followUpCreditsUsed: 1 }))).toBe(false);
  });
});

describe("computeCancellationBreakdown", () => {
  // 30-day period (June has 30 days), ₹499 = 49900 paise.
  const price = 49900;

  it("refunds ~half when cancelling at the midpoint", () => {
    const b = computeCancellationBreakdown(sub(), price, new Date("2026-06-16T00:00:00Z"));
    expect(b.usedDays).toBe(15);
    expect(b.totalDays).toBe(30);
    // 15/30 of the period remains → ~half refunded.
    expect(b.refundPaise).toBe(24950);
    expect(b.deductionPaise).toBe(24950);
    expect(b.refundPaise + b.deductionPaise).toBe(price);
  });

  it("refunds nothing once the period is fully used", () => {
    const b = computeCancellationBreakdown(sub(), price, new Date("2026-07-05T00:00:00Z"));
    expect(b.refundPaise).toBe(0);
    expect(b.deductionPaise).toBe(price);
  });

  it("refunds (almost) everything immediately after starting", () => {
    const b = computeCancellationBreakdown(sub(), price, new Date("2026-06-01T00:00:00Z"));
    expect(b.refundPaise).toBe(price);
    expect(b.deductionPaise).toBe(0);
  });

  it("falls back to full deduction when there is no period", () => {
    const b = computeCancellationBreakdown(null, price);
    expect(b.deductionPaise).toBe(price);
    expect(b.refundPaise).toBe(0);
  });
});

describe("periodHasElapsed / periodEndFrom", () => {
  it("flags an elapsed period", () => {
    expect(
      periodHasElapsed({ currentPeriodEnd: new Date("2026-05-01T00:00:00Z") }, now)
    ).toBe(true);
    expect(
      periodHasElapsed({ currentPeriodEnd: new Date("2026-07-01T00:00:00Z") }, now)
    ).toBe(false);
  });

  it("computes a one-month period end", () => {
    expect(periodEndFrom(new Date("2026-06-01T00:00:00Z")).toISOString()).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });
});
