"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createRefillRequest } from "@/lib/refills";
import { setFollowUpStatus } from "@/lib/follow-ups";

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
