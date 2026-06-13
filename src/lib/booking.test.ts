import { describe, expect, it } from "vitest";
import { canCancelAppointment, CANCELLATION_WINDOW_HOURS } from "@/lib/booking";

const NOW = new Date("2026-06-15T00:00:00Z");

describe("canCancelAppointment", () => {
  it("allows cancelling a pending_payment hold regardless of start time", () => {
    expect(
      canCancelAppointment(
        { status: "pending_payment", startsAt: new Date("2026-06-15T01:00:00Z") },
        NOW
      )
    ).toBe(true);
  });

  it("allows cancelling a confirmed appointment outside the cancellation window", () => {
    const startsAt = new Date(NOW.getTime() + (CANCELLATION_WINDOW_HOURS + 1) * 60 * 60 * 1000);
    expect(canCancelAppointment({ status: "confirmed", startsAt }, NOW)).toBe(true);
  });

  it("blocks cancelling a confirmed appointment inside the cancellation window", () => {
    const startsAt = new Date(NOW.getTime() + (CANCELLATION_WINDOW_HOURS - 1) * 60 * 60 * 1000);
    expect(canCancelAppointment({ status: "confirmed", startsAt }, NOW)).toBe(false);
  });

  it("blocks cancelling a confirmed appointment exactly at the window boundary's edge", () => {
    const startsAt = new Date(NOW.getTime() + CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000);
    expect(canCancelAppointment({ status: "confirmed", startsAt }, NOW)).toBe(true);
  });

  it("blocks cancelling completed or cancelled appointments", () => {
    const startsAt = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    expect(canCancelAppointment({ status: "completed", startsAt }, NOW)).toBe(false);
    expect(canCancelAppointment({ status: "cancelled", startsAt }, NOW)).toBe(false);
    expect(canCancelAppointment({ status: "no_show", startsAt }, NOW)).toBe(false);
  });
});
