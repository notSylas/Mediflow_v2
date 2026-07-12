import { NextResponse } from "next/server";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { listDoctorAppointments } from "@/lib/booking/appointments";
import { listDoctorConversations } from "@/lib/messaging/chat";
import { getOrCreateDoctorProfile } from "@/lib/people/doctor";
import { listDoctorPendingFollowUps } from "@/lib/care/follow-ups";
import { listPendingRefillRequests } from "@/lib/care/refills";
import { listPendingCareFollowUps } from "@/lib/care/care-subscription";

export async function GET() {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  const [appointments, conversations, followUps, refillRequests, careFollowUps] =
    await Promise.all([
      listDoctorAppointments(profile.id),
      listDoctorConversations(access.id),
      listDoctorPendingFollowUps(profile.id),
      listPendingRefillRequests(profile.id),
      listPendingCareFollowUps(profile.id),
    ]);

  const needsPrescription = appointments.filter(
    (row) =>
      row.appointment.status === "completed" && row.prescriptionStatus !== "issued"
  );
  const triageFlagged = appointments.filter(
    (row) =>
      Boolean(row.appointment.triageFlaggedAt) &&
      ["confirmed", "completed"].includes(row.appointment.status)
  );
  const unreadConversations = conversations.filter(
    (row) => row.conversation.doctorUnread > 0
  );

  return NextResponse.json({
    needsPrescription,
    triageFlagged,
    unreadConversations,
    followUps,
    refillRequests,
    careFollowUps,
  });
}
