import { describe, expect, it } from "vitest";
import { getJoinDenial } from "./call-window";

const appointment = {
  status: "confirmed",
  startsAt: new Date("2026-06-15T10:00:00Z"),
  endsAt: new Date("2026-06-15T10:20:00Z"),
};

describe("getJoinDenial", () => {
  it("denies unconfirmed appointments regardless of time", () => {
    expect(
      getJoinDenial(
        { ...appointment, status: "pending_payment" },
        new Date("2026-06-15T10:00:00Z")
      )
    ).toBe("not_confirmed");
    expect(
      getJoinDenial(
        { ...appointment, status: "cancelled" },
        new Date("2026-06-15T10:00:00Z")
      )
    ).toBe("not_confirmed");
  });

  it("denies joining more than 10 minutes early", () => {
    expect(getJoinDenial(appointment, new Date("2026-06-15T09:49:59Z"))).toBe(
      "too_early"
    );
  });

  it("allows joining within the window", () => {
    expect(getJoinDenial(appointment, new Date("2026-06-15T09:50:00Z"))).toBeNull();
    expect(getJoinDenial(appointment, new Date("2026-06-15T10:10:00Z"))).toBeNull();
    expect(getJoinDenial(appointment, new Date("2026-06-15T10:50:00Z"))).toBeNull();
  });

  it("denies joining after the grace period ends", () => {
    expect(getJoinDenial(appointment, new Date("2026-06-15T10:50:01Z"))).toBe(
      "too_late"
    );
  });
});
