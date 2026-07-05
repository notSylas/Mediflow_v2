import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import {
  activateSubscription,
  deactivateSubscription,
  getPatientCareStatus,
  toCareStatusDTO,
  updateCarePreferences,
} from "@/lib/care-subscription";

/** Patient's current MediFlow Care status (home card, settings). */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const status = await getPatientCareStatus(access.id);
  return NextResponse.json({ care: toCareStatusDTO(status) });
}

/**
 * Starts the care plan. v1 is a mock activation (no Razorpay) — the patient
 * self-serves a subscription that begins immediately.
 */
export async function POST() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const status = await getPatientCareStatus(access.id);
  if (!status.doctorId) {
    return NextResponse.json({ error: "No doctor available" }, { status: 404 });
  }

  await activateSubscription(access.id, status.doctorId, "active");
  const next = await getPatientCareStatus(access.id);
  return NextResponse.json({ care: toCareStatusDTO(next) }, { status: 201 });
}

/** Patient cancels their care plan. */
export async function DELETE() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const status = await getPatientCareStatus(access.id);
  if (!status.doctorId) {
    return NextResponse.json({ error: "No doctor available" }, { status: 404 });
  }

  await deactivateSubscription(access.id, status.doctorId, "cancelled");
  const next = await getPatientCareStatus(access.id);
  return NextResponse.json({ care: toCareStatusDTO(next) });
}

const prefsSchema = z.object({
  digestEnabled: z.boolean().optional(),
  medicineRemindersEnabled: z.boolean().optional(),
});

/** Updates digest / medicine-reminder preferences. */
export async function PATCH(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const parsed = prefsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const status = await getPatientCareStatus(access.id);
  if (!status.doctorId || !status.subscription) {
    return NextResponse.json({ error: "No care plan" }, { status: 404 });
  }

  await updateCarePreferences(access.id, status.doctorId, parsed.data);
  const next = await getPatientCareStatus(access.id);
  return NextResponse.json({ care: toCareStatusDTO(next) });
}
