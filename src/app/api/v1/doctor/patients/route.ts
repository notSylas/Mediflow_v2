import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  conversations,
  followUps,
  medicalReports,
  patientProfiles,
  prescriptions,
  refillRequests,
} from "@/db/schema";
import { requireDoctorSession } from "@/lib/api-auth";
import { listDoctorPatients } from "@/lib/appointments";
import { getActiveSubscriberIds } from "@/lib/care-subscription";
import { getOrCreateDoctorProfile } from "@/lib/doctor";

export async function GET(request: Request) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const query = new URL(request.url).searchParams.get("q") ?? undefined;
  const patients = await listDoctorPatients(profile.id, query);

  return NextResponse.json({
    patients: await enrichRoster(profile.id, patients),
    timezone: profile.timezone,
  });
}

async function enrichRoster(
  doctorId: string,
  rows: Awaited<ReturnType<typeof listDoctorPatients>>
) {
  const patientIds = rows.map(({ patient }) => patient.id);
  if (patientIds.length === 0) return [];

  const [
    appointmentRows,
    prescriptionRows,
    profileRows,
    followUpRows,
    refillRows,
    reportRows,
    conversationRows,
    memberIds,
  ] = await Promise.all([
    db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        status: appointments.status,
        startsAt: appointments.startsAt,
        triageFlaggedAt: appointments.triageFlaggedAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          inArray(appointments.patientId, patientIds)
        )
      ),
    db
      .select({
        appointmentId: prescriptions.appointmentId,
        patientId: prescriptions.patientId,
        status: prescriptions.status,
      })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.doctorId, doctorId),
          inArray(prescriptions.patientId, patientIds)
        )
      ),
    db
      .select({
        userId: patientProfiles.userId,
        allergies: patientProfiles.allergies,
        chronicConditions: patientProfiles.chronicConditions,
        currentMedications: patientProfiles.currentMedications,
      })
      .from(patientProfiles)
      .where(inArray(patientProfiles.userId, patientIds)),
    db
      .select({
        patientId: followUps.patientId,
        status: followUps.status,
      })
      .from(followUps)
      .where(and(eq(followUps.doctorId, doctorId), inArray(followUps.patientId, patientIds))),
    db
      .select({
        patientId: refillRequests.patientId,
        status: refillRequests.status,
      })
      .from(refillRequests)
      .where(
        and(eq(refillRequests.doctorId, doctorId), inArray(refillRequests.patientId, patientIds))
      ),
    db
      .select({
        patientId: medicalReports.patientId,
      })
      .from(medicalReports)
      .where(inArray(medicalReports.patientId, patientIds)),
    db
      .select({
        patientId: conversations.patientId,
        doctorUnread: conversations.doctorUnread,
      })
      .from(conversations)
      .where(and(eq(conversations.doctorId, doctorId), inArray(conversations.patientId, patientIds))),
    getActiveSubscriberIds(doctorId),
  ]);

  const prescriptionStatusByAppointment = new Map(
    prescriptionRows.map((row) => [row.appointmentId, row.status])
  );
  const profileByPatient = new Map(profileRows.map((row) => [row.userId, row]));
  const now = Date.now();

  return rows.map((row) => {
    const patientAppointments = appointmentRows.filter(
      (appointment) => appointment.patientId === row.patient.id
    );
    const pendingRxCount = patientAppointments.filter(
      (appointment) =>
        appointment.status === "completed" &&
        prescriptionStatusByAppointment.get(appointment.id) !== "issued"
    ).length;
    const upcomingCount = patientAppointments.filter(
      (appointment) =>
        appointment.status === "confirmed" && appointment.startsAt.getTime() > now
    ).length;
    const triageCount = patientAppointments.filter((appointment) =>
      Boolean(appointment.triageFlaggedAt)
    ).length;
    const profile = profileByPatient.get(row.patient.id);
    return {
      ...row,
      upcomingCount,
      pendingRxCount,
      triageCount,
      pendingFollowUpCount: followUpRows.filter(
        (followUp) => followUp.patientId === row.patient.id && followUp.status === "pending"
      ).length,
      pendingRefillCount: refillRows.filter(
        (refill) => refill.patientId === row.patient.id && refill.status === "pending"
      ).length,
      reportCount: reportRows.filter((report) => report.patientId === row.patient.id).length,
      unreadMessageCount:
        conversationRows.find((conversation) => conversation.patientId === row.patient.id)
          ?.doctorUnread ?? 0,
      isMember: memberIds.has(row.patient.id),
      hasRiskProfile: Boolean(
        profile?.allergies || profile?.chronicConditions || profile?.currentMedications
      ),
    };
  });
}
