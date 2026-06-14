import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listPatientAppointments } from "@/lib/appointments";
import { listPatientPrescriptions } from "@/lib/consult";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";

export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const [appointments, profile, prescriptions, doctorProfile, doctor] =
    await Promise.all([
      listPatientAppointments(access.id),
      getPatientProfile(access.id),
      listPatientPrescriptions(access.id),
      getDoctorProfile(),
      getDoctorCard(),
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

  return NextResponse.json({
    appointments,
    doctor,
    timezone: doctorProfile?.timezone ?? "Asia/Kolkata",
    profileCompleteness: Math.round(
      (profileFields.filter(Boolean).length / profileFields.length) * 100
    ),
    recentPrescriptions: prescriptions.slice(0, 3),
    prescriptionCount: prescriptions.length,
  });
}
