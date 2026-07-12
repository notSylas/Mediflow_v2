import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { listPatientAppointments } from "@/lib/booking/appointments";
import { listPatientPrescriptions } from "@/lib/consult/consult";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";
import { getPatientPendingFollowUp } from "@/lib/follow-ups";

export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const [appointments, profile, prescriptions, doctorProfile, doctor, followUp] =
    await Promise.all([
      listPatientAppointments(access.id),
      getPatientProfile(access.id),
      listPatientPrescriptions(access.id),
      getDoctorProfile(),
      getDoctorCard(),
      getPatientPendingFollowUp(access.id),
    ]);

  const profileFields = [
    profile?.dateOfBirth,
    profile?.gender,
    profile?.bloodGroup,
    profile?.allergies,
    profile?.chronicConditions,
    profile?.currentMedications,
    profile?.emergencyContactName,
  ];

  // Currently-active medicines: from issued prescriptions whose course hasn't
  // ended (no duration = ongoing). Flattened for the patient's "today" view.
  const nowMs = Date.now();
  const DAY_MS = 86_400_000;
  const activeMedications = prescriptions
    .filter((row) => row.prescription.status === "issued" && row.prescription.issuedAt)
    .flatMap((row) => {
      const issuedAt = row.prescription.issuedAt;
      if (!issuedAt) return [];
      const issuedMs = new Date(issuedAt).getTime();
      return row.medicines
        .filter((m) => {
          if (m.durationDays == null) return true;
          return issuedMs + m.durationDays * DAY_MS >= nowMs;
        })
        .map((m) => ({
          name: m.name,
          strength: m.strength,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation,
        }));
    });

  return NextResponse.json({
    appointments,
    doctor,
    timezone: doctorProfile?.timezone ?? "Asia/Kolkata",
    profileCompleteness: Math.round(
      (profileFields.filter(Boolean).length / profileFields.length) * 100
    ),
    recentPrescriptions: prescriptions.slice(0, 3),
    prescriptionCount: prescriptions.length,
    activeMedications,
    followUp,
  });
}
