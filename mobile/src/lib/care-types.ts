/** Wire shape returned by /api/v1/patient/care (mirrors server CareStatusDTO). */
export interface CareStatus {
  active: boolean;
  status: "active" | "inactive" | "cancelled" | "manual_trial" | "none";
  followUpAvailable: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  digestEnabled: boolean;
  medicineRemindersEnabled: boolean;
  priceInPaise: number;
}

export const CARE_PLAN_NAME = "MediFlow Care";

/** Monthly price of the MediFlow Care plan, in paise (₹499/month). */
export const CARE_PLAN_PRICE_PAISE = 49900;

/** Benefits list shown on the unsubscribed card + settings. */
export const CARE_BENEFITS = [
  "Secure messaging with your doctor",
  "One monthly follow-up check-in",
  "Weekly care digest",
  "Medicine reminders from your prescriptions",
  "Easier prescription refill requests",
] as const;

/** Required safety copy — never imply an instant/emergency channel. */
export const CARE_MESSAGING_DISCLAIMER = "Messaging is not for emergencies.";
export const CARE_REPLY_EXPECTATION =
  "Doctor usually replies within clinic hours.";
