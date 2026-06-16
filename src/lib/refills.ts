import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { prescriptions, refillRequests, user } from "@/db/schema";

/**
 * Patient requests a refill of an issued prescription. Resolves the doctor from
 * the prescription and won't duplicate an existing pending request for it.
 */
export async function createRefillRequest(prescriptionId: string, patientId: string) {
  const [rx] = await db
    .select({ doctorId: prescriptions.doctorId, patientId: prescriptions.patientId })
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId));
  if (!rx || rx.patientId !== patientId) return null;

  const [existing] = await db
    .select({ id: refillRequests.id })
    .from(refillRequests)
    .where(
      and(
        eq(refillRequests.prescriptionId, prescriptionId),
        eq(refillRequests.status, "pending")
      )
    );
  if (existing) return existing;

  const [created] = await db
    .insert(refillRequests)
    .values({ patientId, doctorId: rx.doctorId, prescriptionId })
    .returning({ id: refillRequests.id });
  return created;
}

/** Pending refill requests for a doctor, with patient name + source diagnosis. */
export async function listPendingRefillRequests(doctorId: string) {
  return db
    .select({
      id: refillRequests.id,
      createdAt: refillRequests.createdAt,
      prescriptionId: refillRequests.prescriptionId,
      patientId: refillRequests.patientId,
      patientName: user.name,
      patientEmail: user.email,
      diagnosis: prescriptions.diagnosis,
    })
    .from(refillRequests)
    .innerJoin(user, eq(user.id, refillRequests.patientId))
    .innerJoin(prescriptions, eq(prescriptions.id, refillRequests.prescriptionId))
    .where(and(eq(refillRequests.doctorId, doctorId), eq(refillRequests.status, "pending")))
    .orderBy(desc(refillRequests.createdAt));
}

export async function countPendingRefillRequests(doctorId: string): Promise<number> {
  const rows = await db
    .select({ id: refillRequests.id })
    .from(refillRequests)
    .where(and(eq(refillRequests.doctorId, doctorId), eq(refillRequests.status, "pending")));
  return rows.length;
}

/** Loads a pending refill request that belongs to this doctor. */
export async function getDoctorRefillRequest(id: string, doctorId: string) {
  const [row] = await db
    .select()
    .from(refillRequests)
    .where(and(eq(refillRequests.id, id), eq(refillRequests.doctorId, doctorId)));
  return row ?? null;
}

export async function setRefillRequestStatus(
  id: string,
  status: "fulfilled" | "declined"
) {
  await db.update(refillRequests).set({ status }).where(eq(refillRequests.id, id));
}
