import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "~backend/db";
import { appointments, medicalReports, payments } from "~backend/db/schema";
import { isUniqueViolation } from "~backend/db/errors";
import { getAvailableSlots } from "~backend/booking/availability";
import { requireDoctorSession, requireSession } from "~backend/auth/api-auth";
import {
  getAppointmentForParticipant,
  getAppointmentForPatient,
  listPatientAppointments,
} from "~backend/booking/appointments";
import {
  canCancelAppointment,
  CONSENT_SOURCES,
  CONSENT_VERSION,
  formatIntakeNote,
  HOLD_MINUTES,
  VISIT_REASON_VALUES,
} from "~backend/booking/booking";
import { getDoctorProfile } from "~backend/people/doctor";
import { getPatientProfile } from "~backend/people/patient";
import { getBookingProfileMissing } from "~backend/people/patient-readiness";
import { hasEmergencyRedFlag } from "~backend/consult/triage";
import {
  confirmAppointmentPayment,
  getPaymentProvider,
  getRazorpayClient,
  verifyCheckoutSignature,
} from "~backend/payments/payments";
import type { ApiHandler } from "./http";

const createAppointmentSchema = z.object({
  startsAt: z.string().datetime(),
  visitReason: z.enum(VISIT_REASON_VALUES),
  symptoms: z.string().trim().min(1).max(2000),
  reportId: z.string().uuid().optional(),
  // Auditable telemedicine consent — the patient must explicitly accept.
  consent: z.literal(true),
  consentSource: z.enum(CONSENT_SOURCES).default("web"),
});

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

const rescheduleSchema = z.object({ startsAt: z.string().datetime() });

const statusSchema = z.object({
  status: z.enum(["completed", "no_show"]),
});

/** GET /api/appointments — the caller's own appointments. */
export const listAppointments: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const rows = await listPatientAppointments(access.id);
  return Response.json(rows);
};

/** POST /api/appointments — holds a slot pending payment. */
export const createAppointment: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const json = await request.json();
  const parsed = createAppointmentSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const patientProfile = await getPatientProfile(access.id);
  const missingProfile = getBookingProfileMissing(access, patientProfile);

  if (missingProfile.length > 0) {
    return Response.json(
      {
        error:
          "Complete your full name, date of birth, and gender before booking a video consultation.",
        missing: missingProfile,
      },
      { status: 403 }
    );
  }

  const profile = await getDoctorProfile();
  if (!profile) {
    return Response.json({ error: "No doctor is configured yet" }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const now = new Date();

  if (startsAt <= now) {
    return Response.json({ error: "Slot is in the past" }, { status: 400 });
  }

  const endsAt = new Date(startsAt.getTime() + profile.slotMinutes * 60 * 1000);

  const { slots } = await getAvailableSlots(now, endsAt);
  const isValidSlot = slots.some((slot) => slot.getTime() === startsAt.getTime());

  if (!isValidSlot) {
    return Response.json({ error: "Slot is no longer available" }, { status: 409 });
  }

  if (parsed.data.reportId) {
    const [report] = await db
      .select({ id: medicalReports.id })
      .from(medicalReports)
      .where(
        and(
          eq(medicalReports.id, parsed.data.reportId),
          eq(medicalReports.patientId, access.id)
        )
      );

    if (!report) {
      return Response.json({ error: "Report not found" }, { status: 400 });
    }
  }

  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);
  const intakeNote = formatIntakeNote(parsed.data.visitReason, parsed.data.symptoms);
  // Re-run the deterministic red-flag check server-side; the client check is
  // only a UX hint and can't be trusted. This is an audit signal, not a
  // diagnosis, and (per current product policy) warns without blocking.
  const triageFlagged = hasEmergencyRedFlag(parsed.data.symptoms);

  try {
    const created = await db.transaction(async (tx) => {
      // Free up this exact slot if it's only held by an expired hold.
      await tx
        .update(appointments)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(appointments.doctorId, profile.id),
            eq(appointments.startsAt, startsAt),
            eq(appointments.status, "pending_payment"),
            lt(appointments.holdExpiresAt, now)
          )
        );

      const [appointment] = await tx
        .insert(appointments)
        .values({
          doctorId: profile.id,
          patientId: access.id,
          startsAt,
          endsAt,
          status: "pending_payment",
          intakeNote,
          visitReason: parsed.data.visitReason,
          consentVersion: CONSENT_VERSION,
          consentedAt: now,
          consentSource: parsed.data.consentSource,
          triageFlaggedAt: triageFlagged ? now : null,
          holdExpiresAt,
        })
        .returning();

      await tx.insert(payments).values({
        appointmentId: appointment.id,
        amountInPaise: profile.feeInPaise,
        status: "created",
      });

      if (parsed.data.reportId) {
        await tx
          .update(medicalReports)
          .set({ appointmentId: appointment.id })
          .where(
            and(
              eq(medicalReports.id, parsed.data.reportId),
              eq(medicalReports.patientId, access.id)
            )
          );
      }

      return appointment;
    });

    // Surface the server triage result so the client can reinforce the
    // emergency warning even if its own check missed it.
    return Response.json({ ...created, triageFlagged }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "Slot is no longer available" }, { status: 409 });
    }
    throw error;
  }
};

/**
 * POST /api/appointments/:id/payment — starts payment for a held appointment.
 * - mock provider (no Razorpay keys): confirms the booking directly.
 * - razorpay: creates an order for Checkout; confirmation happens in the
 *   verify endpoint / webhook.
 */
export const startAppointmentPayment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const id = params.id;
  const row = await getAppointmentForPatient(id, access.id);

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { appointment, payment } = row;

  if (appointment.status !== "pending_payment") {
    return Response.json(
      { error: "This appointment isn't awaiting payment" },
      { status: 400 }
    );
  }

  if (!appointment.holdExpiresAt || appointment.holdExpiresAt < new Date()) {
    return Response.json(
      { error: "Your slot hold has expired. Please pick a new slot." },
      { status: 410 }
    );
  }

  const provider = getPaymentProvider();

  if (provider === "mock") {
    const confirmed = await confirmAppointmentPayment(id);
    return Response.json({ provider, appointment: confirmed });
  }

  const amountInPaise = payment?.amountInPaise ?? 0;
  if (amountInPaise <= 0) {
    return Response.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  // Reuse the existing order if the patient retries (e.g. closed the popup).
  let orderId = payment?.orderId ?? null;
  if (!orderId) {
    const order = await getRazorpayClient().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: id,
      notes: { appointmentId: id },
    });
    orderId = order.id;

    await db
      .update(payments)
      .set({ orderId, updatedAt: new Date() })
      .where(eq(payments.appointmentId, id));
  }

  return Response.json({
    provider,
    orderId,
    keyId: process.env.RAZORPAY_KEY_ID,
    amountInPaise,
    currency: "INR",
    name: access.name,
    email: access.email,
  });
};

/**
 * POST /api/appointments/:id/payment/verify — confirms a booking from
 * Razorpay Checkout's success callback.
 */
export const verifyAppointmentPayment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const id = params.id;
  const row = await getAppointmentForPatient(id, access.id);

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = verifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (row.payment?.orderId !== parsed.data.razorpayOrderId) {
    return Response.json({ error: "Order mismatch" }, { status: 400 });
  }

  const valid = verifyCheckoutSignature(
    {
      orderId: parsed.data.razorpayOrderId,
      paymentId: parsed.data.razorpayPaymentId,
      signature: parsed.data.razorpaySignature,
    },
    process.env.RAZORPAY_KEY_SECRET ?? ""
  );

  if (!valid) {
    return Response.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const appointment = await confirmAppointmentPayment(
    id,
    parsed.data.razorpayPaymentId
  );

  return Response.json({ appointment });
};

/** GET /api/appointments/:id — one of the caller's own appointments. */
export const getAppointment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getAppointmentForPatient(params.id, access.id);

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(row);
};

/** POST /api/appointments/:id/cancel — either participant cancels. */
export const cancelAppointment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!canCancelAppointment(appointment, new Date())) {
    return Response.json(
      { error: "This appointment can no longer be cancelled" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(eq(appointments.id, params.id))
    .returning();

  return Response.json(updated);
};

/**
 * POST /api/appointments/:id/reschedule — moves a confirmed (already-paid)
 * appointment to a new free slot.
 */
export const rescheduleAppointment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getAppointmentForPatient(params.id, access.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  if (row.appointment.status !== "confirmed") {
    return Response.json(
      { error: "Only confirmed appointments can be rescheduled." },
      { status: 400 }
    );
  }

  const parsed = rescheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getDoctorProfile();
  if (!profile) {
    return Response.json({ error: "No doctor configured" }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const now = new Date();
  if (startsAt <= now) {
    return Response.json({ error: "Pick a future time." }, { status: 400 });
  }

  const endsAt = new Date(startsAt.getTime() + profile.slotMinutes * 60 * 1000);
  const { slots } = await getAvailableSlots(now, endsAt);
  const isFree = slots.some((s) => s.getTime() === startsAt.getTime());
  if (!isFree) {
    return Response.json(
      { error: "That slot isn't available. Please pick another." },
      { status: 409 }
    );
  }

  try {
    const [updated] = await db
      .update(appointments)
      .set({ startsAt, endsAt, updatedAt: new Date() })
      .where(eq(appointments.id, params.id))
      .returning();
    return Response.json({ appointment: updated });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json(
        { error: "That slot was just taken. Please pick another." },
        { status: 409 }
      );
    }
    throw error;
  }
};

/**
 * POST /api/appointments/:id/status — doctor marks a confirmed appointment's
 * outcome after the consult.
 */
export const updateAppointmentStatus: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (appointment.status !== "confirmed") {
    return Response.json(
      { error: "Only confirmed appointments can be marked completed or no-show." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(appointments.id, params.id))
    .returning();

  return Response.json(updated);
};
