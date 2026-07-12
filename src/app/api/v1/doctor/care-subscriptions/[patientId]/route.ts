import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getOrCreateDoctorProfile } from "@/lib/people/doctor";
import {
  activateSubscription,
  deactivateSubscription,
  getSubscription,
  resetFollowUpCredit,
  toCareStatusDTO,
} from "@/lib/care/care-subscription";
import { isSubscriptionActive } from "@/lib/care/care-subscription-policy";

const schema = z.object({
  action: z.enum(["activate", "trial", "deactivate", "reset-credit"]),
});

/**
 * Doctor/admin toggle for a patient's MediFlow Care subscription. v1 billing
 * stand-in — there is no Razorpay recurring flow yet. Doctor-only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { patientId } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);

  switch (parsed.data.action) {
    case "activate":
      await activateSubscription(patientId, profile.id, "active");
      break;
    case "trial":
      await activateSubscription(patientId, profile.id, "manual_trial");
      break;
    case "deactivate":
      await deactivateSubscription(patientId, profile.id, "inactive");
      break;
    case "reset-credit":
      await resetFollowUpCredit(patientId, profile.id);
      break;
  }

  const sub = await getSubscription(patientId, profile.id);
  return NextResponse.json({
    care: toCareStatusDTO({
      subscription: sub,
      active: isSubscriptionActive(sub),
      followUpAvailable:
        isSubscriptionActive(sub) &&
        (sub?.followUpCreditsUsed ?? 1) < 1,
      doctorId: profile.id,
      priceInPaise: profile.carePlanPriceInPaise,
    }),
  });
}
