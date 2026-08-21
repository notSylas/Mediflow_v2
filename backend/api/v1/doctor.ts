import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "~backend/db";
import {
  appointments,
  availabilityOverrides,
  availabilityRules,
  conversations,
  followUps,
  medicalReports,
  patientProfiles,
  prescriptions,
  refillRequests,
  user,
} from "~backend/db/schema";
import { requireDoctorSession } from "~backend/auth/api-auth";
import {
  listDoctorAppointments,
  listDoctorPatients,
} from "~backend/booking/appointments";
import { listDoctorConversations } from "~backend/messaging/chat";
import {
  getEncounterData,
  getMedicineHistory,
  getPatientHistory,
} from "~backend/consult/consult";
import {
  getDoctorEarnings,
  getDoctorPaymentStats,
  getDoctorRevenueInPaise,
  getOrCreateDoctorProfile,
} from "~backend/people/doctor";
import { getPatientProfile } from "~backend/people/patient";
import {
  countDoctorPendingFollowUps,
  listDoctorPendingFollowUps,
} from "~backend/care/follow-ups";
import {
  countPendingRefillRequests,
  listPendingRefillRequests,
} from "~backend/care/refills";
import {
  countActiveSubscribers,
  getActiveSubscriberIds,
  getDoctorPatientCareStatus,
  listPendingCareFollowUps,
} from "~backend/care/care-subscription";
import type { ApiHandler } from "../http";

/** GET /api/v1/doctor/appointments */
export const getDoctorAppointments: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  return Response.json({
    appointments: await listDoctorAppointments(profile.id),
    timezone: profile.timezone,
  });
};

/** GET /api/v1/doctor/schedule */
export const getDoctorSchedule: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [rules, overrides, appointmentRows] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime)),
    db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.doctorId, profile.id))
      .orderBy(asc(availabilityOverrides.date)),
    listDoctorAppointments(profile.id),
  ]);

  return Response.json({
    rules,
    overrides,
    appointments: appointmentRows,
    timezone: profile.timezone,
  });
};

/** GET /api/v1/doctor/work-queue */
export const getWorkQueue: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [
    appointmentRows,
    conversationRows,
    pendingFollowUps,
    pendingRefillRequests,
    careFollowUps,
  ] = await Promise.all([
    listDoctorAppointments(profile.id),
    listDoctorConversations(access.id),
    listDoctorPendingFollowUps(profile.id),
    listPendingRefillRequests(profile.id),
    listPendingCareFollowUps(profile.id),
  ]);

  const needsPrescription = appointmentRows.filter(
    (row) =>
      row.appointment.status === "completed" && row.prescriptionStatus !== "issued"
  );
  const triageFlagged = appointmentRows.filter(
    (row) =>
      Boolean(row.appointment.triageFlaggedAt) &&
      ["confirmed", "completed"].includes(row.appointment.status)
  );
  const unreadConversations = conversationRows.filter(
    (row) => row.conversation.doctorUnread > 0
  );

  return Response.json({
    needsPrescription,
    triageFlagged,
    unreadConversations,
    followUps: pendingFollowUps,
    refillRequests: pendingRefillRequests,
    careFollowUps,
  });
};

/** GET /api/v1/doctor/encounters/:id */
export const getEncounter: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const encounter = await getEncounterData(params.id, access.id);
  if (!encounter) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [profile, history, medicineHistory, patientProfile] = await Promise.all([
    getOrCreateDoctorProfile(access.id),
    getPatientHistory(encounter.patient.id, encounter.doctorProfileId, params.id),
    getMedicineHistory(encounter.patient.id, encounter.doctorProfileId),
    getPatientProfile(encounter.patient.id),
  ]);

  return Response.json({
    encounter,
    history,
    medicineHistory,
    patientProfile,
    timezone: profile.timezone,
  });
};

/** GET /api/v1/doctor/home */
export const getDoctorHome: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [
    appointmentRows,
    revenueInPaise,
    earnings,
    pendingFollowUps,
    pendingRefills,
    activeCareMembers,
    careFollowUps,
    paymentStats,
    rules,
    issued,
  ] = await Promise.all([
    listDoctorAppointments(profile.id),
    getDoctorRevenueInPaise(profile.id),
    getDoctorEarnings(profile.id),
    countDoctorPendingFollowUps(profile.id),
    countPendingRefillRequests(profile.id),
    countActiveSubscribers(profile.id),
    listPendingCareFollowUps(profile.id),
    getDoctorPaymentStats(profile.id),
    db
      .select({ id: availabilityRules.id })
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .limit(1),
    db
      .select({ appointmentId: prescriptions.appointmentId })
      .from(prescriptions)
      .where(
        and(eq(prescriptions.doctorId, profile.id), eq(prescriptions.status, "issued"))
      ),
  ]);

  // Completed visits that don't yet have an issued prescription.
  const issuedSet = new Set(issued.map((r) => r.appointmentId));
  const awaitingPrescription = appointmentRows.filter(
    (row) =>
      row.appointment.status === "completed" && !issuedSet.has(row.appointment.id)
  ).length;

  return Response.json({
    appointments: appointmentRows,
    profile,
    revenueInPaise,
    earnings,
    hasAvailability: rules.length > 0,
    awaitingPrescription,
    pendingFollowUps,
    pendingRefills,
    activeCareMembers,
    pendingCareFollowUps: careFollowUps.length,
    paymentStats,
  });
};

/** GET /api/v1/doctor/patients?q= */
export const listPatients: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const query = new URL(request.url).searchParams.get("q") ?? undefined;
  const patients = await listDoctorPatients(profile.id, query);

  return Response.json({
    patients: await enrichRoster(profile.id, patients),
    timezone: profile.timezone,
  });
};

/** GET /api/v1/doctor/patients/:id */
export const getPatient: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const roster = await listDoctorPatients(profile.id);
  if (!roster.some(({ patient }) => patient.id === params.id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [patient] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, params.id));
  if (!patient) {
    return Response.json({ error: "Not found" }, { status: 404 });
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
    getPatientHistory(params.id, profile.id),
    getMedicineHistory(params.id, profile.id),
    getPatientProfile(params.id),
    db
      .select({
        id: followUps.id,
        dueAt: followUps.dueAt,
        status: followUps.status,
        createdAt: followUps.createdAt,
        sourceAppointmentId: followUps.sourceAppointmentId,
      })
      .from(followUps)
      .where(eq(followUps.patientId, params.id)),
    db
      .select({
        id: refillRequests.id,
        prescriptionId: refillRequests.prescriptionId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
      })
      .from(refillRequests)
      .where(eq(refillRequests.patientId, params.id)),
    db
      .select({
        id: medicalReports.id,
        filename: medicalReports.filename,
        mimeType: medicalReports.mimeType,
        createdAt: medicalReports.createdAt,
      })
      .from(medicalReports)
      .where(eq(medicalReports.patientId, params.id)),
    db
      .select({
        id: conversations.id,
        lastMessageAt: conversations.lastMessageAt,
        lastMessagePreview: conversations.lastMessagePreview,
        doctorUnread: conversations.doctorUnread,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.patientId, params.id),
          eq(conversations.doctorId, profile.id)
        )
      )
      .then((rows) => rows[0] ?? null),
    getDoctorPatientCareStatus(params.id, profile.id),
  ]);

  return Response.json({
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
};

/**
 * Decorates the patient roster with the per-patient counters the list view
 * shows. Batched: one query per related table across all patients, rather than
 * per-row lookups.
 */
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
      .where(
        and(eq(followUps.doctorId, doctorId), inArray(followUps.patientId, patientIds))
      ),
    db
      .select({
        patientId: refillRequests.patientId,
        status: refillRequests.status,
      })
      .from(refillRequests)
      .where(
        and(
          eq(refillRequests.doctorId, doctorId),
          inArray(refillRequests.patientId, patientIds)
        )
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
      .where(
        and(
          eq(conversations.doctorId, doctorId),
          inArray(conversations.patientId, patientIds)
        )
      ),
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
        (followUp) =>
          followUp.patientId === row.patient.id && followUp.status === "pending"
      ).length,
      pendingRefillCount: refillRows.filter(
        (refill) => refill.patientId === row.patient.id && refill.status === "pending"
      ).length,
      reportCount: reportRows.filter((report) => report.patientId === row.patient.id)
        .length,
      unreadMessageCount:
        conversationRows.find(
          (conversation) => conversation.patientId === row.patient.id
        )?.doctorUnread ?? 0,
      isMember: memberIds.has(row.patient.id),
      hasRiskProfile: Boolean(
        profile?.allergies || profile?.chronicConditions || profile?.currentMedications
      ),
    };
  });
}
