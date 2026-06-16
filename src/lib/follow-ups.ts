import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, followUps, user } from "@/db/schema";

/**
 * Doctor recommends a follow-up from a completed/active visit. Replaces any
 * existing pending follow-up for the same source visit so re-recommending just
 * updates the due date.
 */
export async function createFollowUp(args: {
  doctorId: string;
  sourceAppointmentId: string;
  inDays: number;
}) {
  const [appt] = await db
    .select({ patientId: appointments.patientId, doctorId: appointments.doctorId })
    .from(appointments)
    .where(eq(appointments.id, args.sourceAppointmentId));
  if (!appt || appt.doctorId !== args.doctorId) return null;

  const dueAt = new Date(Date.now() + args.inDays * 86_400_000);

  await db
    .delete(followUps)
    .where(
      and(
        eq(followUps.sourceAppointmentId, args.sourceAppointmentId),
        eq(followUps.status, "pending")
      )
    );

  const [created] = await db
    .insert(followUps)
    .values({
      patientId: appt.patientId,
      doctorId: args.doctorId,
      sourceAppointmentId: args.sourceAppointmentId,
      dueAt,
    })
    .returning();
  return created;
}

/** The soonest pending follow-up for a patient (what the home card surfaces). */
export async function getPatientPendingFollowUp(patientId: string) {
  const [row] = await db
    .select({ id: followUps.id, dueAt: followUps.dueAt })
    .from(followUps)
    .where(and(eq(followUps.patientId, patientId), eq(followUps.status, "pending")))
    .orderBy(asc(followUps.dueAt))
    .limit(1);
  return row ?? null;
}

/** Count of pending follow-ups a doctor has recommended (dashboard worklist). */
export async function countDoctorPendingFollowUps(doctorId: string): Promise<number> {
  const rows = await db
    .select({ id: followUps.id })
    .from(followUps)
    .where(and(eq(followUps.doctorId, doctorId), eq(followUps.status, "pending")));
  return rows.length;
}

/** Pending follow-ups for the doctor's work queue, with patient identity. */
export async function listDoctorPendingFollowUps(doctorId: string) {
  return db
    .select({
      id: followUps.id,
      patientId: followUps.patientId,
      patientName: user.name,
      patientEmail: user.email,
      sourceAppointmentId: followUps.sourceAppointmentId,
      dueAt: followUps.dueAt,
      createdAt: followUps.createdAt,
      status: followUps.status,
    })
    .from(followUps)
    .innerJoin(user, eq(user.id, followUps.patientId))
    .where(and(eq(followUps.doctorId, doctorId), eq(followUps.status, "pending")))
    .orderBy(asc(followUps.dueAt));
}

/** Patient acknowledges (booked) or dismisses their follow-up. */
export async function setFollowUpStatus(
  id: string,
  patientId: string,
  status: "booked" | "dismissed"
) {
  const [updated] = await db
    .update(followUps)
    .set({ status })
    .where(and(eq(followUps.id, id), eq(followUps.patientId, patientId)))
    .returning();
  return updated ?? null;
}
