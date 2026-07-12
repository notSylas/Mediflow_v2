"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { createRefillRequest } from "@/lib/care/refills";
import { setFollowUpStatus } from "@/lib/care/follow-ups";
import {
  activateSubscription,
  deactivateSubscription,
  getPatientCareStatus,
  requestFollowUp,
  updateCarePreferences,
} from "@/lib/care/care-subscription";

async function requirePatient() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role === "doctor") redirect("/doctor");
  return session.user;
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${key}`);
  }
  return value.trim();
}

export async function requestRefillAction(formData: FormData) {
  const user = await requirePatient();
  const prescriptionId = requiredString(formData, "prescriptionId");
  const created = await createRefillRequest(prescriptionId, user.id);
  if (!created) {
    throw new Error("Prescription not found");
  }

  revalidatePath("/patient/prescriptions");
  revalidatePath("/patient");
}

export async function dismissFollowUpAction(formData: FormData) {
  const user = await requirePatient();
  const followUpId = requiredString(formData, "followUpId");
  await setFollowUpStatus(followUpId, user.id, "dismissed");
  revalidatePath("/patient");
}

function revalidateCareSurfaces() {
  revalidatePath("/patient");
  revalidatePath("/patient/settings");
  revalidatePath("/messages");
}

/**
 * Completes care-plan checkout. v1 is a mock payment (no Razorpay recurring) —
 * this activates the plan and lands the patient back on settings. The Razorpay
 * subscription flow will replace the body here without touching callers.
 */
export async function payCarePlanAction() {
  const user = await requirePatient();
  const status = await getPatientCareStatus(user.id);
  if (!status.doctorId) throw new Error("No doctor available");
  await activateSubscription(user.id, status.doctorId, "active");
  revalidateCareSurfaces();
  redirect("/patient/settings?care=started");
}

/** Cancels the patient's care plan (after the breakdown confirmation screen). */
export async function cancelCareAction() {
  const user = await requirePatient();
  const status = await getPatientCareStatus(user.id);
  if (!status.doctorId) throw new Error("No doctor available");
  await deactivateSubscription(user.id, status.doctorId, "cancelled");
  revalidateCareSurfaces();
  redirect("/patient/settings?care=cancelled");
}

/** Spends the monthly care follow-up credit. */
export async function requestCareFollowUpAction() {
  const user = await requirePatient();
  const result = await requestFollowUp(user.id, null);
  if (!result.ok) {
    throw new Error(
      result.reason === "not_subscribed"
        ? "An active care plan is required."
        : "Your follow-up for this period has already been used."
    );
  }
  revalidateCareSurfaces();
}

/** Updates digest / medicine-reminder preferences. */
export async function updateCarePrefsAction(formData: FormData) {
  const user = await requirePatient();
  const status = await getPatientCareStatus(user.id);
  if (!status.doctorId || !status.subscription) throw new Error("No care plan");
  await updateCarePreferences(user.id, status.doctorId, {
    digestEnabled: formData.get("digestEnabled") === "on",
    medicineRemindersEnabled: formData.get("medicineRemindersEnabled") === "on",
  });
  revalidatePath("/patient/settings");
}
