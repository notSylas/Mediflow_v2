import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~backend/db";
import {
  consultNotes,
  prescriptionMedicines,
  prescriptions,
} from "~backend/db/schema";
import { requireDoctorSession } from "~backend/auth/api-auth";
import { getAppointmentForParticipant } from "~backend/booking/appointments";
import { getPrescriptionWithMedicines } from "~backend/consult/consult";
import type { ApiHandler } from "./http";

const soapSchema = z.object({
  subjective: z.string().max(10_000).nullish(),
  objective: z.string().max(10_000).nullish(),
  assessment: z.string().max(10_000).nullish(),
  plan: z.string().max(10_000).nullish(),
});

const medicineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  strength: z.string().trim().max(100).nullish(),
  route: z.string().trim().max(100).nullish(),
  morning: z.boolean().default(false),
  afternoon: z.boolean().default(false),
  evening: z.boolean().default(false),
  night: z.boolean().default(false),
  foodRelation: z.string().trim().max(100).nullish(),
  durationDays: z.number().int().min(1).max(365).nullish(),
  instructions: z.string().trim().max(500).nullish(),
});

const prescriptionSchema = z.object({
  diagnosis: z.string().trim().max(5000).nullish(),
  advice: z.string().trim().max(5000).nullish(),
  validUntil: z.string().date().nullish(),
  medicines: z.array(medicineSchema).max(30),
});

/** PUT /api/appointments/:id/consult-note — upserts the SOAP note. */
export const saveConsultNote: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = soapSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const [note] = await db
    .insert(consultNotes)
    .values({ appointmentId: params.id, ...parsed.data })
    .onConflictDoUpdate({
      target: consultNotes.appointmentId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  return Response.json(note);
};

/** GET /api/appointments/:id/consult-note */
export const getConsultNote: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [note] = await db
    .select()
    .from(consultNotes)
    .where(eq(consultNotes.appointmentId, params.id));

  return Response.json(note ?? null);
};

/**
 * PUT /api/appointments/:id/prescription — upserts the draft prescription for
 * an appointment. Issued ones are locked.
 */
export const savePrescription: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = prescriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await getPrescriptionWithMedicines(params.id);
  if (existing?.status === "issued") {
    return Response.json(
      { error: "This prescription has been issued and can no longer be edited." },
      { status: 409 }
    );
  }

  const { medicines, ...fields } = parsed.data;

  const saved = await db.transaction(async (tx) => {
    const [prescription] = await tx
      .insert(prescriptions)
      .values({
        appointmentId: params.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        ...fields,
      })
      .onConflictDoUpdate({
        target: prescriptions.appointmentId,
        set: { ...fields, updatedAt: new Date() },
      })
      .returning();

    await tx
      .delete(prescriptionMedicines)
      .where(eq(prescriptionMedicines.prescriptionId, prescription.id));

    if (medicines.length > 0) {
      await tx.insert(prescriptionMedicines).values(
        medicines.map((med, index) => ({
          prescriptionId: prescription.id,
          ...med,
          sortOrder: index,
        }))
      );
    }

    return prescription;
  });

  return Response.json(await getPrescriptionWithMedicines(saved.appointmentId));
};

/**
 * POST /api/appointments/:id/prescription/issue — issues the draft
 * prescription, locking it permanently.
 */
export const issuePrescription: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const appointment = await getAppointmentForParticipant(params.id, access);

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const prescription = await getPrescriptionWithMedicines(params.id);

  if (!prescription) {
    return Response.json({ error: "No prescription to issue" }, { status: 400 });
  }

  if (prescription.status === "issued") {
    return Response.json({ error: "Already issued" }, { status: 409 });
  }

  if (prescription.medicines.length === 0 && !prescription.diagnosis) {
    return Response.json(
      { error: "Add a diagnosis or at least one medicine before issuing." },
      { status: 400 }
    );
  }

  const [issued] = await db
    .update(prescriptions)
    .set({ status: "issued", issuedAt: new Date(), updatedAt: new Date() })
    .where(eq(prescriptions.id, prescription.id))
    .returning();

  return Response.json(issued);
};
