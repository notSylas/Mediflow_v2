import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Download, FileText } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getAppointmentForPatient } from "@/lib/booking/appointments";
import { getPrescriptionWithMedicines } from "@/lib/consult/consult";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";
import { getPatientProfile } from "@/lib/patient";
import { patientDocumentName } from "@/lib/patient-identity";
import { statusLabel } from "@/lib/booking/appointment-status";
import { JoinCallButton } from "@/components/JoinCallButton";
import { RescheduleDialog } from "@/components/patient/RescheduleDialog";
import { CountdownRing } from "@/components/wow/CountdownRing";
import { PrescriptionDocument } from "@/components/patient/PrescriptionDocument";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PatientAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getAppointmentForPatient(id, session.user.id);
  if (!row) notFound();

  const { appointment, payment, report } = row;
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

  const prescription =
    appointment.status === "completed"
      ? await getPrescriptionWithMedicines(id).then((p) =>
          p?.status === "issued" ? p : null
        )
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div>
        <Link
          href="/patient/appointments"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← My appointments
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {formatInTimeZone(appointment.startsAt, timezone, "EEEE, MMM d")}
          </h1>
          <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
            {statusLabel(appointment.status, "patient")}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatInTimeZone(appointment.startsAt, timezone, "h:mm a")} –{" "}
          {formatInTimeZone(appointment.endsAt, timezone, "h:mm a")}
          {profile && <> · Dr. consultation fee ₹{(profile.feeInPaise / 100).toFixed(2)}</>}
        </p>
      </div>

      {appointment.status === "confirmed" && (
        <div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            {/* Glass hero — the gradient/depth budget (docs/Design.md) spent
                on this one moment: a confirmed, paid video consultation.
                Action buttons live outside it, not on top of the gradient —
                a default-variant button would lose contrast against its own
                primary color. */}
            <div className="glass-hero anim-fade-up p-6">
              <p className="text-sm font-medium text-primary-foreground/85">
                Your video consultation
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatInTimeZone(appointment.startsAt, timezone, "EEE, MMM d · h:mm a")}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/85">
                The room opens 10 minutes before your slot — make sure your
                camera and microphone are working, you&apos;ll get a preview
                screen before joining.
              </p>
            </div>
            {/* Kept as its own frosted surface — CountdownRing's stroke/text
                colors are tuned for a neutral card background and would lose
                contrast painted directly onto the glass-hero gradient. */}
            <div className="glass-frost flex items-center justify-center p-4">
              <CountdownRing startsAt={appointment.startsAt.toISOString()} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <JoinCallButton
              appointmentId={appointment.id}
              status={appointment.status}
              startsAt={appointment.startsAt.toISOString()}
              endsAt={appointment.endsAt.toISOString()}
            />
            <RescheduleDialog appointmentId={appointment.id} timezone={timezone} />
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What you told the doctor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointment.intakeNote && (
            <p className="whitespace-pre-wrap text-sm">{appointment.intakeNote}</p>
          )}
          {report && (
            <a
              href={`/api/reports/${report.id}`}
              target="_blank"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              {report.filename}
            </a>
          )}
          {payment && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Payment: {payment.status} · ₹{(payment.amountInPaise / 100).toFixed(2)}
              {payment.status === "paid" && (
                <Link
                  href={`/patient/appointments/${appointment.id}/receipt`}
                  className="text-primary hover:underline"
                >
                  View receipt
                </Link>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {prescription && (
        <PrescriptionDocument
          prescription={prescription}
          appointment={appointment}
          medicines={prescription.medicines}
          doctor={doctor}
          patient={patient}
          timezone={timezone}
          actions={
            <>
              <p className="text-sm text-muted-foreground">
                Keep this prescription available when buying medicines or booking a review.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/patient/prescriptions/${prescription.id}`}>
                    <Download className="mr-2 h-4 w-4" />
                    Download prescription
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/patient/prescriptions">All prescriptions</Link>
                </Button>
              </div>
            </>
          }
        />
      )}

      {appointment.status === "completed" && !prescription && (
        <p className="text-sm text-muted-foreground">
          The doctor didn&apos;t issue a prescription for this consultation.
        </p>
      )}
    </div>
  );
}
