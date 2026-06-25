import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  consultNotes,
  doctorProfiles,
  medicalReports,
  prescriptionMedicines,
  prescriptions,
  user,
} from "@/db/schema";

/**
 * Loads everything the doctor's encounter screen needs for one appointment,
 * scoped to the doctor who owns it.
 */
export async function getEncounterData(appointmentId: string, doctorUserId: string) {
  const [row] = await db
    .select({
      appointment: appointments,
      patient: { id: user.id, name: user.name, email: user.email },
      doctorProfileId: doctorProfiles.id,
      doctorUserId: doctorProfiles.userId,
    })
    .from(appointments)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
    .innerJoin(user, eq(user.id, appointments.patientId))
    .where(eq(appointments.id, appointmentId));

  if (!row || row.doctorUserId !== doctorUserId) return null;

  const [note, prescription, reports] = await Promise.all([
    db
      .select()
      .from(consultNotes)
      .where(eq(consultNotes.appointmentId, appointmentId))
      .then((r) => r[0] ?? null),
    getPrescriptionWithMedicines(appointmentId),
    db
      .select({
        id: medicalReports.id,
        filename: medicalReports.filename,
        mimeType: medicalReports.mimeType,
        createdAt: medicalReports.createdAt,
      })
      .from(medicalReports)
      .where(eq(medicalReports.appointmentId, appointmentId)),
  ]);

  return { ...row, note, prescription, reports };
}

export async function getPrescriptionWithMedicines(appointmentId: string) {
  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.appointmentId, appointmentId));

  if (!prescription) return null;

  const medicines = await db
    .select()
    .from(prescriptionMedicines)
    .where(eq(prescriptionMedicines.prescriptionId, prescription.id))
    .orderBy(asc(prescriptionMedicines.sortOrder));

  return { ...prescription, medicines };
}

/**
 * A returning patient's history with this doctor: every past appointment
 * (excluding the one being consulted) with its consult note and issued
 * prescription + medicines, newest first.
 */
export async function getPatientHistory(
  patientId: string,
  doctorProfileId: string,
  excludeAppointmentId?: string
) {
  const conditions = [
    eq(appointments.patientId, patientId),
    eq(appointments.doctorId, doctorProfileId),
    eq(appointments.status, "completed"),
  ];
  if (excludeAppointmentId) {
    conditions.push(ne(appointments.id, excludeAppointmentId));
  }

  const pastAppointments = await db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(desc(appointments.startsAt));

  return Promise.all(
    pastAppointments.map(async (appointment) => {
      const [note, prescription] = await Promise.all([
        db
          .select()
          .from(consultNotes)
          .where(eq(consultNotes.appointmentId, appointment.id))
          .then((r) => r[0] ?? null),
        getPrescriptionWithMedicines(appointment.id).then((p) =>
          p?.status === "issued" ? p : null
        ),
      ]);

      return { appointment, note, prescription };
    })
  );
}

/** All medicines a patient has ever been issued by this doctor, newest first. */
export async function getMedicineHistory(patientId: string, doctorProfileId: string) {
  return db
    .select({
      medicine: prescriptionMedicines,
      issuedAt: prescriptions.issuedAt,
      appointmentId: prescriptions.appointmentId,
    })
    .from(prescriptionMedicines)
    .innerJoin(prescriptions, eq(prescriptions.id, prescriptionMedicines.prescriptionId))
    .where(
      and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.doctorId, doctorProfileId),
        eq(prescriptions.status, "issued")
      )
    )
    .orderBy(desc(prescriptions.issuedAt), asc(prescriptionMedicines.sortOrder));
}

/** All issued prescriptions for a patient with their medicines, newest first. */
export async function listPatientPrescriptions(patientId: string) {
  const issued = await db
    .select({ prescription: prescriptions, appointment: appointments })
    .from(prescriptions)
    .innerJoin(appointments, eq(appointments.id, prescriptions.appointmentId))
    .where(
      and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, "issued"))
    )
    .orderBy(desc(prescriptions.issuedAt));

  return Promise.all(
    issued.map(async ({ prescription, appointment }) => ({
      prescription,
      appointment,
      medicines: await db
        .select()
        .from(prescriptionMedicines)
        .where(eq(prescriptionMedicines.prescriptionId, prescription.id))
        .orderBy(asc(prescriptionMedicines.sortOrder)),
    }))
  );
}

/** One issued prescription for the signed-in patient, with appointment and medicines. */
export async function getPatientPrescriptionById(patientId: string, prescriptionId: string) {
  const [row] = await db
    .select({ prescription: prescriptions, appointment: appointments })
    .from(prescriptions)
    .innerJoin(appointments, eq(appointments.id, prescriptions.appointmentId))
    .where(
      and(
        eq(prescriptions.id, prescriptionId),
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.status, "issued")
      )
    );

  if (!row) return null;

  const medicines = await db
    .select()
    .from(prescriptionMedicines)
    .where(eq(prescriptionMedicines.prescriptionId, row.prescription.id))
    .orderBy(asc(prescriptionMedicines.sortOrder));

  return { ...row, medicines };
}
