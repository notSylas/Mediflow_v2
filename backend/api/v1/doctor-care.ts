import { z } from "zod";
import { requireDoctorSession } from "~backend/auth/api-auth";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { createAsyncConsult } from "~backend/booking/appointments";
import {
  getDoctorRefillRequest,
  listPendingRefillRequests,
  setRefillRequestStatus,
} from "~backend/care/refills";
import {
  activateSubscription,
  deactivateSubscription,
  getDoctorCareFollowUp,
  getSubscription,
  listDoctorSubscribers,
  resetFollowUpCredit,
  setCareFollowUpStatus,
  toCareStatusDTO,
} from "~backend/care/care-subscription";
import { isSubscriptionActive } from "~backend/care/care-subscription-policy";
import type { ApiHandler } from "../http";

const asyncConsultSchema = z.object({
  patientId: z.string().min(1),
  visitReason: z.string().trim().max(200).optional(),
});

const careFollowUpActionSchema = z.object({
  action: z.enum(["fulfill", "dismiss"]),
});

const subscriptionActionSchema = z.object({
  action: z.enum(["activate", "trial", "deactivate", "reset-credit"]),
});

/**
 * POST /api/v1/doctor/async-consult — doctor starts an async (no-video)
 * consult to prescribe a follow-up/refill.
 */
export const startAsyncConsult: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = asyncConsultSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);
  const created = await createAsyncConsult({
    doctorId: profile.id,
    patientId: parsed.data.patientId,
    visitReason: parsed.data.visitReason ?? "Follow-up consult",
  });
  return Response.json({ appointmentId: created.id }, { status: 201 });
};

/**
 * GET /api/v1/doctor/refill-requests — pending refill requests the doctor
 * needs to act on.
 */
export const listRefillRequests: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const requests = await listPendingRefillRequests(profile.id);
  return Response.json({ requests });
};

/** POST /api/v1/doctor/refill-requests/:id/decline */
export const declineRefillRequest: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const req = await getDoctorRefillRequest(params.id, profile.id);
  if (!req || req.status !== "pending") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await setRefillRequestStatus(params.id, "declined");
  return Response.json({ ok: true });
};

/**
 * POST /api/v1/doctor/refill-requests/:id/fulfill — opens an async consult to
 * prescribe in.
 */
export const fulfillRefillRequest: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const req = await getDoctorRefillRequest(params.id, profile.id);
  if (!req || req.status !== "pending") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const consult = await createAsyncConsult({
    doctorId: profile.id,
    patientId: req.patientId,
    visitReason: "Refill request",
    intakeNote: "Patient requested a refill of a previous prescription.",
  });
  await setRefillRequestStatus(params.id, "fulfilled");
  return Response.json({ appointmentId: consult.id }, { status: 201 });
};

/**
 * GET /api/v1/doctor/care-subscriptions — care-plan members + summary counts,
 * for the care-management screen.
 */
export const listCareSubscriptions: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const subscribers = await listDoctorSubscribers(profile.id);

  return Response.json({
    subscribers,
    activeCount: subscribers.filter((s) => s.active).length,
    totalCount: subscribers.length,
  });
};

/**
 * POST /api/v1/doctor/care-follow-ups/:id — doctor acts on a patient's
 * care-plan follow-up request. "fulfill" opens an async consult to
 * review/prescribe in; "dismiss" closes it without one.
 */
export const actOnCareFollowUp: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = careFollowUpActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);
  const req = await getDoctorCareFollowUp(params.id, profile.id);
  if (!req || req.status !== "pending") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "dismiss") {
    await setCareFollowUpStatus(params.id, "dismissed");
    return Response.json({ ok: true });
  }

  const consult = await createAsyncConsult({
    doctorId: profile.id,
    patientId: req.patientId,
    visitReason: "Care plan follow-up",
    intakeNote:
      req.note ?? "Patient requested their monthly MediFlow Care follow-up.",
  });
  await setCareFollowUpStatus(params.id, "booked", consult.id);
  return Response.json({ appointmentId: consult.id }, { status: 201 });
};

/**
 * POST /api/v1/doctor/care-subscriptions/:patientId — doctor/admin toggle for
 * a patient's MediFlow Care subscription. v1 billing stand-in — there is no
 * Razorpay recurring flow yet. Doctor-only.
 */
export const updateCareSubscription: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = subscriptionActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const patientId = params.patientId;
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
  return Response.json({
    care: toCareStatusDTO({
      subscription: sub,
      active: isSubscriptionActive(sub),
      followUpAvailable:
        isSubscriptionActive(sub) && (sub?.followUpCreditsUsed ?? 1) < 1,
      doctorId: profile.id,
      priceInPaise: profile.carePlanPriceInPaise,
    }),
  });
};
