import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  doctorProfiles,
  medicalReports,
  payments,
  prescriptions,
  user,
} from "@/db/schema";
import type { Session } from "@/lib/auth/auth";

/**
 * Creates a doctor-initiated async consult (no video, no payment) so the doctor
 * can prescribe a follow-up/refill. It's marked completed immediately — the
 * "consultation" is the prescribing itself — and shows in the patient's history.
 */
export async function createAsyncConsult(args: {
  doctorId: string;
  patientId: string;
  visitReason: string;
  intakeNote?: string | null;
}) {
  const now = new Date();
  const [created] = await db
    .insert(appointments)
    .values({
      doctorId: args.doctorId,
      patientId: args.patientId,
      startsAt: now,
      endsAt: now,
      status: "completed",
      mode: "async",
      visitReason: args.visitReason,
      intakeNote: args.intakeNote ?? null,
    })
    .returning({ id: appointments.id });
  return created;
}

/**
 * The doctor's patient roster: everyone with at least one non-cancelled
 * appointment, with visit count and most recent visit, optionally filtered
 * by a name/email search term.
 */
export async function listDoctorPatients(doctorProfileId: string, query?: string) {
  const conditions = [
    eq(appointments.doctorId, doctorProfileId),
    ne(appointments.status, "cancelled"),
  ];
  if (query?.trim()) {
    const term = `%${query.trim()}%`;
    conditions.push(or(ilike(user.name, term), ilike(user.email, term))!);
  }

  return db
    .select({
      patient: { id: user.id, name: user.name, email: user.email },
      // Aggregate expressions do not automatically inherit the selected
      // column's driver decoder. Without mapWith, Postgres returns both values
      // as strings (including a timestamp format Hermes cannot parse).
      visitCount: sql`count(*)`.mapWith(Number),
      lastVisit: sql`max(${appointments.startsAt})`.mapWith(appointments.startsAt),
    })
    .from(appointments)
    .innerJoin(user, eq(user.id, appointments.patientId))
    .where(and(...conditions))
    .groupBy(user.id, user.name, user.email)
    .orderBy(sql`max(${appointments.startsAt}) desc`);
}

/**
 * Loads an appointment if the given user is one of its two participants —
 * the booking patient, or the doctor it was booked with.
 */
export async function getAppointmentForParticipant(
  id: string,
  user: Pick<Session["user"], "id" | "role">
) {
  const [row] = await db
    .select({ appointment: appointments, doctorUserId: doctorProfiles.userId })
    .from(appointments)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
    .where(eq(appointments.id, id));

  if (!row) return null;

  const isPatient = row.appointment.patientId === user.id;
  const isDoctor = user.role === "doctor" && row.doctorUserId === user.id;
  if (!isPatient && !isDoctor) return null;

  return row.appointment;
}

export async function getAppointmentForPatient(id: string, patientId: string) {
  const [row] = await db
    .select({ appointment: appointments, payment: payments, report: medicalReports })
    .from(appointments)
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .leftJoin(medicalReports, eq(medicalReports.appointmentId, appointments.id))
    .where(eq(appointments.id, id));

  if (!row || row.appointment.patientId !== patientId) return null;

  return row;
}

/** All appointments for a doctor profile, patient name included, newest first. */
export async function listDoctorAppointments(doctorProfileId: string) {
  return db
    .select({
      appointment: appointments,
      patient: { id: user.id, name: user.name, email: user.email },
      prescriptionStatus: prescriptions.status,
      prescriptionIssuedAt: prescriptions.issuedAt,
    })
    .from(appointments)
    .innerJoin(user, eq(user.id, appointments.patientId))
    .leftJoin(prescriptions, eq(prescriptions.appointmentId, appointments.id))
    .where(eq(appointments.doctorId, doctorProfileId))
    .orderBy(desc(appointments.startsAt));
}

export async function listPatientAppointments(patientId: string) {
  return db
    .select({ appointment: appointments, payment: payments, report: medicalReports })
    .from(appointments)
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .leftJoin(medicalReports, eq(medicalReports.appointmentId, appointments.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.startsAt));
}
