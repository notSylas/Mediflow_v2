"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAsyncConsult } from "@/lib/appointments";
import { auth } from "@/lib/auth";
import { createFollowUp, dismissFollowUp, snoozeFollowUp } from "@/lib/follow-ups";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { getDoctorRefillRequest, setRefillRequestStatus } from "@/lib/refills";
import { getConversationForParticipant, markConversationRead } from "@/lib/chat";

async function requireDoctor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");
  const profile = await getOrCreateDoctorProfile(session.user.id);
  return { session, profile };
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${key}`);
  }
  return value.trim();
}

export async function startAsyncConsultAction(formData: FormData) {
  const { profile } = await requireDoctor();
  const patientId = requiredString(formData, "patientId");
  const visitReason =
    typeof formData.get("visitReason") === "string"
      ? String(formData.get("visitReason")).trim()
      : "";

  const created = await createAsyncConsult({
    doctorId: profile.id,
    patientId,
    visitReason: visitReason || "Follow-up consult",
  });

  redirect(`/doctor/encounter/${created.id}`);
}

export async function createFollowUpAction(formData: FormData) {
  const { profile } = await requireDoctor();
  const appointmentId = requiredString(formData, "appointmentId");
  const inDaysValue = requiredString(formData, "inDays");
  const inDays = Number.parseInt(inDaysValue, 10);
  if (!Number.isFinite(inDays) || inDays < 1 || inDays > 365) {
    throw new Error("Invalid follow-up interval");
  }

  await createFollowUp({
    doctorId: profile.id,
    sourceAppointmentId: appointmentId,
    inDays,
  });

  revalidatePath(`/doctor/encounter/${appointmentId}`);
  revalidatePath("/doctor/work-queue");
}

export async function fulfillRefillRequestAction(formData: FormData) {
  const { profile } = await requireDoctor();
  const requestId = requiredString(formData, "requestId");
  const request = await getDoctorRefillRequest(requestId, profile.id);
  if (!request || request.status !== "pending") {
    throw new Error("Refill request not found");
  }

  const consult = await createAsyncConsult({
    doctorId: profile.id,
    patientId: request.patientId,
    visitReason: "Refill request",
    intakeNote: "Patient requested a refill of a previous prescription.",
  });

  await setRefillRequestStatus(requestId, "fulfilled");
  revalidatePath("/doctor/refill-requests");
  revalidatePath("/doctor/work-queue");
  redirect(`/doctor/encounter/${consult.id}`);
}

export async function declineRefillRequestAction(formData: FormData) {
  const { profile } = await requireDoctor();
  const requestId = requiredString(formData, "requestId");
  const request = await getDoctorRefillRequest(requestId, profile.id);
  if (!request || request.status !== "pending") {
    throw new Error("Refill request not found");
  }

  await setRefillRequestStatus(requestId, "declined");
  revalidatePath("/doctor/refill-requests");
  revalidatePath("/doctor/work-queue");
}

/** Dismiss a pending follow-up from the work queue without booking it. */
export async function dismissFollowUpAction(formData: FormData) {
  const { profile } = await requireDoctor();
  const followUpId = requiredString(formData, "followUpId");

  const updated = await dismissFollowUp(followUpId, profile.id);
  if (!updated) throw new Error("Follow-up not found");

  revalidatePath("/doctor/work-queue");
}

/** Push a pending follow-up's due date back by 7 days from the work queue. */
export async function snoozeFollowUpAction(formData: FormData) {
  const { profile } = await requireDoctor();
  const followUpId = requiredString(formData, "followUpId");

  const updated = await snoozeFollowUp(followUpId, profile.id, 7);
  if (!updated) throw new Error("Follow-up not found");

  revalidatePath("/doctor/work-queue");
}

/** Mark a conversation read from the work queue without opening the inbox. */
export async function markMessageReadAction(formData: FormData) {
  const { session } = await requireDoctor();
  const conversationId = requiredString(formData, "conversationId");

  const row = await getConversationForParticipant(conversationId, session.user);
  if (!row) throw new Error("Conversation not found");

  await markConversationRead(conversationId, "doctor");
  revalidatePath("/doctor/work-queue");
}
