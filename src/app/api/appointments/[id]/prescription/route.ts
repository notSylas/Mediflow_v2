import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prescriptionMedicines, prescriptions } from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getAppointmentForParticipant } from "@/lib/booking/appointments";
import { getPrescriptionWithMedicines } from "@/lib/consult";

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

/** Upserts the draft prescription for an appointment. Issued ones are locked. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const appointment = await getAppointmentForParticipant(id, access);

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = prescriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await getPrescriptionWithMedicines(id);
  if (existing?.status === "issued") {
    return NextResponse.json(
      { error: "This prescription has been issued and can no longer be edited." },
      { status: 409 }
    );
  }

  const { medicines, ...fields } = parsed.data;

  const saved = await db.transaction(async (tx) => {
    const [prescription] = await tx
      .insert(prescriptions)
      .values({
        appointmentId: id,
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

  return NextResponse.json(await getPrescriptionWithMedicines(saved.appointmentId));
}
