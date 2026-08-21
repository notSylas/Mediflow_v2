import { describe, expect, it } from "vitest";
import { hasEmergencyRedFlag } from "./triage";

describe("hasEmergencyRedFlag", () => {
  it("flags emergency phrases regardless of case", () => {
    expect(hasEmergencyRedFlag("I have severe CHEST PAIN")).toBe(true);
    expect(hasEmergencyRedFlag("can't breathe properly")).toBe(true);
    expect(hasEmergencyRedFlag("think I'm having a heart attack")).toBe(true);
  });

  it("does not flag ordinary symptoms", () => {
    expect(hasEmergencyRedFlag("mild sore throat for two days")).toBe(false);
    expect(hasEmergencyRedFlag("need a prescription refill")).toBe(false);
    expect(hasEmergencyRedFlag("")).toBe(false);
  });
});
