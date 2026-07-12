import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, medicalReports, payments } from "@/db/schema";
import { getAvailableSlots } from "@/lib/booking/availability";
import { requireSession } from "@/lib/auth/api-auth";
import { listPatientAppointments } from "@/lib/booking/appointments";
import {
  CONSENT_SOURCES,
  CONSENT_VERSION,
  formatIntakeNote,
  HOLD_MINUTES,
  VISIT_REASON_VALUES,
} from "@/lib/booking/booking";
import { getDoctorProfile } from "@/lib/doctor";
import { isUniqueViolation } from "@/lib/core/db-errors";
import { getPatientProfile } from "@/lib/patient";
import { getBookingProfileMissing } from "@/lib/patient-readiness";
import { hasEmergencyRedFlag } from "@/lib/consult/triage";

const createAppointmentSchema = z.object({
  startsAt: z.string().datetime(),
  visitReason: z.enum(VISIT_REASON_VALUES),
  symptoms: z.string().trim().min(1).max(2000),
  reportId: z.string().uuid().optional(),
  // Auditable telemedicine consent — the patient must explicitly accept.
  consent: z.literal(true),
  consentSource: z.enum(CONSENT_SOURCES).default("web"),
});

export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const rows = await listPatientAppointments(access.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const json = await request.json();
  const parsed = createAppointmentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const patientProfile = await getPatientProfile(access.id);
  const missingProfile = getBookingProfileMissing(access, patientProfile);

  if (missingProfile.length > 0) {
    return NextResponse.json(
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
    return NextResponse.json({ error: "No doctor is configured yet" }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const now = new Date();

  if (startsAt <= now) {
    return NextResponse.json({ error: "Slot is in the past" }, { status: 400 });
  }

  const endsAt = new Date(startsAt.getTime() + profile.slotMinutes * 60 * 1000);

  const { slots } = await getAvailableSlots(now, endsAt);
  const isValidSlot = slots.some((slot) => slot.getTime() === startsAt.getTime());

  if (!isValidSlot) {
    return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
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
      return NextResponse.json({ error: "Report not found" }, { status: 400 });
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
    return NextResponse.json({ ...created, triageFlagged }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
    }
    throw error;
  }
}
