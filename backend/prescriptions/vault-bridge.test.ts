import { describe, expect, it } from "vitest";
import { analyzedPrescriptionToRecordFields } from "~backend/vault/vault-extraction";

describe("analyzedPrescriptionToRecordFields", () => {
  it("buckets confidence rather than passing the float through", () => {
    expect(analyzedPrescriptionToRecordFields({ overall_confidence: 0.9 }).confidence).toBe("high");
    expect(analyzedPrescriptionToRecordFields({ overall_confidence: 0.6 }).confidence).toBe("medium");
    expect(analyzedPrescriptionToRecordFields({ overall_confidence: 0.2 }).confidence).toBe("low");
    expect(analyzedPrescriptionToRecordFields({}).confidence).toBe("low");
  });

  it("reads positional Indian dosing shorthand", () => {
    const three = analyzedPrescriptionToRecordFields({
      medications: [{ name: "Telma", frequency_raw: "1-0-1" }],
    }).medicines[0];
    // 3-slot form is morning-afternoon-night: 1-0-1 means morning + night.
    expect(three).toMatchObject({ morning: true, afternoon: false, evening: false, night: true });

    const four = analyzedPrescriptionToRecordFields({
      medications: [{ name: "X", frequency_raw: "1-1-0-1" }],
    }).medicines[0];
    expect(four).toMatchObject({ morning: true, afternoon: true, evening: false, night: true });
  });

  it("reads the common abbreviations", () => {
    const at = (raw: string) =>
      analyzedPrescriptionToRecordFields({ medications: [{ name: "X", frequency_raw: raw }] })
        .medicines[0];
    expect(at("BD")).toMatchObject({ morning: true, night: true });
    expect(at("HS")).toMatchObject({ night: true, morning: false });
    expect(at("TDS")).toMatchObject({ morning: true, afternoon: true, night: true });
  });

  it("leaves every slot false when the schedule is unreadable", () => {
    const med = analyzedPrescriptionToRecordFields({
      medications: [{ name: "X", frequency_raw: "squiggle" }],
    }).medicines[0];
    expect(med).toMatchObject({ morning: false, afternoon: false, evening: false, night: false });
  });

  it("normalises duration to days", () => {
    const days = (d: string) =>
      analyzedPrescriptionToRecordFields({ medications: [{ name: "X", duration: d }] })
        .medicines[0].durationDays;
    expect(days("5 days")).toBe(5);
    expect(days("2 weeks")).toBe(14);
    expect(days("1 month")).toBe(30);
    expect(days("until better")).toBeNull();
  });

  it("falls back to the raw text when no drug name was read", () => {
    const med = analyzedPrescriptionToRecordFields({
      medications: [{ raw_text: "Tab. ???? 500", name: null }],
    }).medicines[0];
    expect(med.name).toBe("Tab. ???? 500");
  });

  it("only classifies as a prescription when medicines were found", () => {
    expect(analyzedPrescriptionToRecordFields({ medications: [] }).recordType).toBeNull();
    expect(
      analyzedPrescriptionToRecordFields({ medications: [{ name: "X" }] }).recordType
    ).toBe("prescription");
  });
});
