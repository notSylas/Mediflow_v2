import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "@/lib/slots";

const TZ = "Asia/Kolkata";

// 2026-06-15 is a Monday (weekday 1); 2026-06-17 is a Wednesday (weekday 3).
const MONDAY = "2026-06-15";
const monFrom = new Date(`${MONDAY}T00:00:00Z`);
const monTo = new Date("2026-06-16T00:00:00Z");

describe("computeAvailableSlots", () => {
  it("does not produce duplicate slots when rules overlap", () => {
    const slots = computeAvailableSlots({
      // Two overlapping Monday rules: 09:00–10:00 and 09:30–10:30. The
      // 09:30 slot is in both and must appear exactly once.
      rules: [
        { weekday: 1, startTime: "09:00", endTime: "10:00" },
        { weekday: 1, startTime: "09:30", endTime: "10:30" },
      ],
      overrides: [],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    const iso = slots.map((d) => d.toISOString());
    expect(new Set(iso).size).toBe(iso.length); // no duplicates
    expect(iso).toEqual([
      "2026-06-15T03:30:00.000Z", // 09:00
      "2026-06-15T04:00:00.000Z", // 09:30
      "2026-06-15T04:30:00.000Z", // 10:00
    ]);
  });

  it("returns slots for a plain weekly rule", () => {
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "09:00", endTime: "10:00" }],
      overrides: [],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-06-15T03:30:00.000Z",
      "2026-06-15T04:00:00.000Z",
    ]);
  });

  it("removes all slots on a full-day blocked override", () => {
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "09:00", endTime: "10:00" }],
      overrides: [{ date: MONDAY, kind: "blocked" }],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    expect(slots).toEqual([]);
  });

  it("removes only the overlapping range on a partial blocked override", () => {
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "09:00", endTime: "12:00" }],
      overrides: [
        { date: MONDAY, kind: "blocked", startTime: "10:00", endTime: "11:00" },
      ],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-06-15T03:30:00.000Z", // 09:00 IST
      "2026-06-15T04:00:00.000Z", // 09:30 IST
      "2026-06-15T05:30:00.000Z", // 11:00 IST
      "2026-06-15T06:00:00.000Z", // 11:30 IST
    ]);
  });

  it("adds slots from an extra-session override on a day with no rules", () => {
    const WEDNESDAY = "2026-06-17";
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "09:00", endTime: "10:00" }],
      overrides: [
        { date: WEDNESDAY, kind: "extra", startTime: "18:00", endTime: "19:00" },
      ],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: new Date(`${WEDNESDAY}T00:00:00Z`),
      to: new Date("2026-06-18T00:00:00Z"),
    });

    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-06-17T12:30:00.000Z", // 18:00 IST
      "2026-06-17T13:00:00.000Z", // 18:30 IST
    ]);
  });

  it("drops a slot that overlaps an existing appointment", () => {
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "09:00", endTime: "10:00" }],
      overrides: [],
      busy: [
        {
          start: new Date("2026-06-15T03:30:00Z"),
          end: new Date("2026-06-15T04:00:00Z"),
        },
      ],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-06-15T04:00:00.000Z",
    ]);
  });

  it("drops a slot that overlaps a non-expired pending-payment hold", () => {
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "09:00", endTime: "10:00" }],
      overrides: [],
      busy: [
        {
          start: new Date("2026-06-15T04:00:00Z"),
          end: new Date("2026-06-15T04:30:00Z"),
        },
      ],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-06-15T03:30:00.000Z",
    ]);
  });

  it("converts Asia/Kolkata local time to UTC with the correct fixed offset", () => {
    const slots = computeAvailableSlots({
      rules: [{ weekday: 1, startTime: "14:00", endTime: "14:30" }],
      overrides: [],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: monTo,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].toISOString()).toBe("2026-06-15T08:30:00.000Z");
  });

  it("returns no slots when there are no rules", () => {
    const slots = computeAvailableSlots({
      rules: [],
      overrides: [],
      busy: [],
      slotMinutes: 30,
      timezone: TZ,
      from: monFrom,
      to: new Date("2026-06-22T00:00:00Z"),
    });

    expect(slots).toEqual([]);
  });
});
