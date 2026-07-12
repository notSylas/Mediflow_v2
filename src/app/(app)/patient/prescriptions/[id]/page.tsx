import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getPatientPrescriptionById } from "@/lib/consult/consult";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";
import { patientDocumentName } from "@/lib/patient-identity";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/patient/PrintButton";
import { PrescriptionDocument } from "@/components/patient/PrescriptionDocument";

export default async function PatientPrescriptionTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getPatientPrescriptionById(session.user.id, id);
  if (!row) notFound();

  const [profile, doctor, patientProfile] = await Promise.all([
    getDoctorProfile(),
    getDoctorCard(),
    getPatientProfile(session.user.id),
  ]);

  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const patient = {
    name: patientDocumentName(session.user),
    email: session.user.email,
    dateOfBirth: patientProfile?.dateOfBirth,
    gender: patientProfile?.gender,
    bloodGroup: patientProfile?.bloodGroup,
    allergies: patientProfile?.allergies,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6 print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost">
          <Link href="/patient/prescriptions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <PrintButton
          label="Download prescription"
          targetId={`prescription-${row.prescription.id}`}
        />
      </div>

      <PrescriptionDocument
        prescription={row.prescription}
        appointment={row.appointment}
        medicines={row.medicines}
        doctor={doctor}
        patient={patient}
        timezone={timezone}
      />
    </div>
  );
}
