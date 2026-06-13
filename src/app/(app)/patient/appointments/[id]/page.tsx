import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAppointmentForPatient } from "@/lib/appointments";
import { getPrescriptionWithMedicines } from "@/lib/consult";
import { describeMedicineSchedule } from "@/lib/medicines";
import { getDoctorProfile } from "@/lib/doctor";
import { JoinCallButton } from "@/components/JoinCallButton";
import { RescheduleDialog } from "@/components/patient/RescheduleDialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

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
  const profile = await getDoctorProfile();
  const timezone = profile?.timezone ?? "Asia/Kolkata";

  const prescription =
    appointment.status === "completed"
      ? await getPrescriptionWithMedicines(id).then((p) =>
          p?.status === "issued" ? p : null
        )
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
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
            {STATUS_LABELS[appointment.status] ?? appointment.status}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatInTimeZone(appointment.startsAt, timezone, "h:mm a")} –{" "}
          {formatInTimeZone(appointment.endsAt, timezone, "h:mm a")}
          {profile && <> · Dr. consultation fee ₹{(profile.feeInPaise / 100).toFixed(2)}</>}
        </p>
      </div>

      {appointment.status === "confirmed" && (
        <Card>
          <CardHeader>
            <CardTitle>Your video consultation</CardTitle>
            <CardDescription>
              The room opens 10 minutes before your slot. Make sure your camera and
              microphone are working — you&apos;ll get a preview screen before joining.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <JoinCallButton
              appointmentId={appointment.id}
              status={appointment.status}
              startsAt={appointment.startsAt.toISOString()}
              endsAt={appointment.endsAt.toISOString()}
            />
            <RescheduleDialog appointmentId={appointment.id} timezone={timezone} />
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Your prescription</CardTitle>
            {prescription.issuedAt && (
              <CardDescription>
                Issued {formatInTimeZone(prescription.issuedAt, timezone, "MMM d, yyyy")}
                {prescription.validUntil && <> · valid until {prescription.validUntil}</>}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prescription.diagnosis && (
              <p>
                <span className="text-muted-foreground">Diagnosis: </span>
                {prescription.diagnosis}
              </p>
            )}
            {prescription.medicines.map((med) => (
              <div key={med.id} className="rounded-md border p-3">
                <p className="font-medium">
                  {med.name}
                  {med.strength && <span className="text-muted-foreground"> {med.strength}</span>}
                </p>
                <p className="text-muted-foreground">{describeMedicineSchedule(med)}</p>
                {med.instructions && <p className="text-muted-foreground">{med.instructions}</p>}
              </div>
            ))}
            {prescription.advice && (
              <p>
                <span className="text-muted-foreground">Advice: </span>
                {prescription.advice}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {appointment.status === "completed" && !prescription && (
        <p className="text-sm text-muted-foreground">
          The doctor didn&apos;t issue a prescription for this consultation.
        </p>
      )}
    </div>
  );
}
