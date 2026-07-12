import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  followUps,
  medicalReports,
  refillRequests,
  user,
} from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { listDoctorPatients } from "@/lib/booking/appointments";
import { getMedicineHistory, getPatientHistory } from "@/lib/consult";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";
import { getDoctorPatientCareStatus } from "@/lib/care-subscription";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(access.id);
  const roster = await listDoctorPatients(profile.id);
  if (!roster.some(({ patient }) => patient.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [patient] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, id));
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [
    history,
    medicineHistory,
    patientProfile,
    followUpHistory,
    refillHistory,
    reports,
    conversation,
    care,
  ] = await Promise.all([
    getPatientHistory(id, profile.id),
    getMedicineHistory(id, profile.id),
    getPatientProfile(id),
    db
      .select({
        id: followUps.id,
        dueAt: followUps.dueAt,
        status: followUps.status,
        createdAt: followUps.createdAt,
        sourceAppointmentId: followUps.sourceAppointmentId,
      })
      .from(followUps)
      .where(eq(followUps.patientId, id)),
    db
      .select({
        id: refillRequests.id,
        prescriptionId: refillRequests.prescriptionId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
      })
      .from(refillRequests)
      .where(eq(refillRequests.patientId, id)),
    db
      .select({
        id: medicalReports.id,
        filename: medicalReports.filename,
        mimeType: medicalReports.mimeType,
        createdAt: medicalReports.createdAt,
      })
      .from(medicalReports)
      .where(eq(medicalReports.patientId, id)),
    db
      .select({
        id: conversations.id,
        lastMessageAt: conversations.lastMessageAt,
        lastMessagePreview: conversations.lastMessagePreview,
        doctorUnread: conversations.doctorUnread,
      })
      .from(conversations)
      .where(and(eq(conversations.patientId, id), eq(conversations.doctorId, profile.id)))
      .then((rows) => rows[0] ?? null),
    getDoctorPatientCareStatus(id, profile.id),
  ]);

  return NextResponse.json({
    patient,
    patientProfile,
    history,
    medicineHistory,
    followUps: followUpHistory,
    refillRequests: refillHistory,
    reports,
    conversation,
    care,
    timezone: profile.timezone,
  });
}
