import { z } from "zod";
import { requireSession } from "~backend/auth/api-auth";
import {
  getAppointmentForPatient,
  listPatientAppointments,
} from "~backend/booking/appointments";
import { canCancelAppointment } from "~backend/booking/booking";
import {
  getPrescriptionWithMedicines,
  listPatientPrescriptions,
} from "~backend/consult/consult";
import { getDoctorCard, getDoctorProfile } from "~backend/people/doctor";
import { getPatientProfile } from "~backend/people/patient";
import { getPatientPendingFollowUp } from "~backend/care/follow-ups";
import { createRefillRequest } from "~backend/care/refills";
import {
  activateSubscription,
  deactivateSubscription,
  getCancellationBreakdown,
  getPatientCareStatus,
  requestFollowUp,
  toCareStatusDTO,
  updateCarePreferences,
} from "~backend/care/care-subscription";
import type { ApiHandler } from "../http";

const refillSchema = z.object({ prescriptionId: z.string().uuid() });

const prefsSchema = z.object({
  digestEnabled: z.boolean().optional(),
  medicineRemindersEnabled: z.boolean().optional(),
});

const careFollowUpSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

/** GET /api/v1/patient/appointments/:id */
export const getPatientAppointment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getAppointmentForPatient(params.id, access.id);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [prescription, profile, doctor] = await Promise.all([
    getPrescriptionWithMedicines(params.id).then((value) =>
      value?.status === "issued" ? value : null
    ),
    getDoctorProfile(),
    getDoctorCard(),
  ]);

  return Response.json({
    ...row,
    prescription,
    doctor,
    timezone: profile?.timezone ?? "Asia/Kolkata",
    canCancel: canCancelAppointment(row.appointment, new Date()),
  });
};

/** GET /api/v1/patient/prescriptions */
export const listPrescriptions: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const [prescriptions, profile, doctor] = await Promise.all([
    listPatientPrescriptions(access.id),
    getDoctorProfile(),
    getDoctorCard(),
  ]);

  return Response.json({
    prescriptions,
    doctor,
    timezone: profile?.timezone ?? "Asia/Kolkata",
  });
};

/**
 * POST /api/v1/patient/refill-requests — patient requests a refill of one of
 * their issued prescriptions.
 */
export const requestRefill: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = refillSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const created = await createRefillRequest(parsed.data.prescriptionId, access.id);
  if (!created) {
    return Response.json({ error: "Prescription not found" }, { status: 404 });
  }
  return Response.json({ ok: true }, { status: 201 });
};

/** GET /api/v1/patient/care — current MediFlow Care status (home card, settings). */
export const getCare: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const status = await getPatientCareStatus(access.id);
  return Response.json({ care: toCareStatusDTO(status) });
};

/**
 * POST /api/v1/patient/care — starts the care plan. v1 is a mock activation
 * (no Razorpay) — the patient self-serves a subscription that begins
 * immediately.
 */
export const startCare: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const status = await getPatientCareStatus(access.id);
  if (!status.doctorId) {
    return Response.json({ error: "No doctor available" }, { status: 404 });
  }

  await activateSubscription(access.id, status.doctorId, "active");
  const next = await getPatientCareStatus(access.id);
  return Response.json({ care: toCareStatusDTO(next) }, { status: 201 });
};

/** DELETE /api/v1/patient/care — patient cancels their care plan. */
export const cancelCare: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const status = await getPatientCareStatus(access.id);
  if (!status.doctorId) {
    return Response.json({ error: "No doctor available" }, { status: 404 });
  }

  await deactivateSubscription(access.id, status.doctorId, "cancelled");
  const next = await getPatientCareStatus(access.id);
  return Response.json({ care: toCareStatusDTO(next) });
};

/**
 * PATCH /api/v1/patient/care — updates digest / medicine-reminder preferences.
 */
export const updateCare: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = prefsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const status = await getPatientCareStatus(access.id);
  if (!status.doctorId || !status.subscription) {
    return Response.json({ error: "No care plan" }, { status: 404 });
  }

  await updateCarePreferences(access.id, status.doctorId, parsed.data);
  const next = await getPatientCareStatus(access.id);
  return Response.json({ care: toCareStatusDTO(next) });
};

/**
 * GET /api/v1/patient/care/cancellation — pro-rated deduction/refund breakdown
 * shown before the patient cancels.
 */
export const getCareCancellation: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const breakdown = await getCancellationBreakdown(access.id);
  return Response.json({ breakdown });
};

/**
 * POST /api/v1/patient/care/follow-up — patient spends their one monthly
 * follow-up credit, creating an async check-in request the doctor sees in their
 * work queue. 403 if not subscribed, 409 if the credit is already used this
 * period.
 */
export const requestCareFollowUp: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const body = await request.json().catch(() => ({}));
  const parsed = careFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await requestFollowUp(access.id, parsed.data.note ?? null);
  if (!result.ok) {
    if (result.reason === "not_subscribed") {
      return Response.json(
        { error: "An active care plan is required to request a follow-up." },
        { status: 403 }
      );
    }
    return Response.json(
      { error: "Your follow-up for this period has already been used." },
      { status: 409 }
    );
  }
  return Response.json({ ok: true, request: result.request }, { status: 201 });
};

/** GET /api/v1/patient/home — everything the patient landing page needs. */
export const getPatientHome: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const [appointments, profile, prescriptions, doctorProfile, doctor, followUp] =
    await Promise.all([
      listPatientAppointments(access.id),
      getPatientProfile(access.id),
      listPatientPrescriptions(access.id),
      getDoctorProfile(),
      getDoctorCard(),
      getPatientPendingFollowUp(access.id),
    ]);

  const profileFields = [
    profile?.dateOfBirth,
    profile?.gender,
    profile?.bloodGroup,
    profile?.allergies,
    profile?.chronicConditions,
    profile?.currentMedications,
    profile?.emergencyContactName,
  ];

  // Currently-active medicines: from issued prescriptions whose course hasn't
  // ended (no duration = ongoing). Flattened for the patient's "today" view.
  const nowMs = Date.now();
  const DAY_MS = 86_400_000;
  const activeMedications = prescriptions
    .filter((row) => row.prescription.status === "issued" && row.prescription.issuedAt)
    .flatMap((row) => {
      const issuedAt = row.prescription.issuedAt;
      if (!issuedAt) return [];
      const issuedMs = new Date(issuedAt).getTime();
      return row.medicines
        .filter((m) => {
          if (m.durationDays == null) return true;
          return issuedMs + m.durationDays * DAY_MS >= nowMs;
        })
        .map((m) => ({
          name: m.name,
          strength: m.strength,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation,
        }));
    });

  return Response.json({
    appointments,
    doctor,
    timezone: doctorProfile?.timezone ?? "Asia/Kolkata",
    profileCompleteness: Math.round(
      (profileFields.filter(Boolean).length / profileFields.length) * 100
    ),
    recentPrescriptions: prescriptions.slice(0, 3),
    prescriptionCount: prescriptions.length,
    activeMedications,
    followUp,
  });
};
