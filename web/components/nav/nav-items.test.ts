import { describe, expect, it } from "vitest";
import { isNavActive } from "./nav-items";

describe("isNavActive", () => {
  it("matches the exact route", () => {
    expect(isNavActive("/doctor", "/doctor")).toBe(true);
    expect(isNavActive("/messages", "/messages")).toBe(true);
  });

  it("does not keep a section root active on its subpages", () => {
    // "/patient" has only two segments, so it activates on exact match only —
    // otherwise Home would stay highlighted across every patient subpage.
    expect(isNavActive("/patient", "/patient/book")).toBe(false);
    expect(isNavActive("/doctor", "/doctor/appointments")).toBe(false);
  });

  it("activates a nested section on its detail subpages", () => {
    expect(
      isNavActive("/doctor/refill-requests", "/doctor/refill-requests/abc-123")
    ).toBe(true);
    expect(
      isNavActive("/doctor/encounter", "/doctor/encounter/42")
    ).toBe(true);
  });

  it("does not match a different sibling route", () => {
    expect(isNavActive("/doctor/schedule", "/doctor/appointments")).toBe(false);
  });

  it("does not partial-match across a segment boundary", () => {
    // "/patient/booking" must not light up the "/patient/book" item.
    expect(isNavActive("/patient/book", "/patient/booking")).toBe(false);
  });
});
