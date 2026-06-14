import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getEncounterData,
  getMedicineHistory,
  getPatientHistory,
} from "@/lib/consult";
import { describeMedicineSchedule } from "@/lib/medicines";
import { ageFromDob, genderLabel, getPatientProfile } from "@/lib/patient";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { JoinCallButton } from "@/components/JoinCallButton";
import { PresenceBadge } from "@/components/PresenceBadge";
import { OutcomeButtons } from "@/components/doctor/OutcomeButtons";
import { PrescriptionComposer } from "@/components/doctor/PrescriptionComposer";
import { SoapEditor } from "@/components/doctor/SoapEditor";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { statusLabel } from "@/lib/appointment-status";

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { id } = await params;
  const data = await getEncounterData(id, session.user.id);
  if (!data) notFound();

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const [history, medicineHistory, patientProfile] = await Promise.all([
    getPatientHistory(data.patient.id, data.doctorProfileId, id),
    getMedicineHistory(data.patient.id, data.doctorProfileId),
    getPatientProfile(data.patient.id),
  ]);

  const { appointment } = data;
  const timezone = profile.timezone;
  const isReturning = history.length > 0;
  const age = ageFromDob(patientProfile?.dateOfBirth ?? null);
  const snapshotItems = [
    age !== null ? `${age} yrs` : null,
    genderLabel(patientProfile?.gender ?? null),
    patientProfile?.bloodGroup ? `Blood ${patientProfile.bloodGroup}` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <Link
          href="/doctor/appointments"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All appointments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{data.patient.name}</h1>
          <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
            {statusLabel(appointment.status, "doctor")}
          </Badge>
          {isReturning && <Badge variant="outline">Returning patient</Badge>}
          {appointment.status === "confirmed" && (
            <PresenceBadge appointmentId={appointment.id} />
          )}
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatInTimeZone(appointment.startsAt, timezone, "EEEE, MMM d 'at' h:mm a")}
          {" · "}
          {data.patient.email}
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Patient snapshot</CardTitle>
          {snapshotItems.length > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {snapshotItems.join(" · ")}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!patientProfile && (
            <p className="text-muted-foreground">
              This patient hasn&apos;t filled in their medical profile yet.
            </p>
          )}
          {patientProfile?.allergies && (
            <p>
              <span className="font-medium text-destructive">Allergies: </span>
              {patientProfile.allergies}
            </p>
          )}
          {patientProfile?.chronicConditions && (
            <p>
              <span className="text-muted-foreground">Conditions: </span>
              {patientProfile.chronicConditions}
            </p>
          )}
          {patientProfile?.currentMedications && (
            <p>
              <span className="text-muted-foreground">Current meds: </span>
              {patientProfile.currentMedications}
            </p>
          )}
          {patientProfile?.emergencyContactName && (
            <p className="text-muted-foreground">
              Emergency contact: {patientProfile.emergencyContactName}
              {patientProfile.emergencyContactPhone &&
                ` · ${patientProfile.emergencyContactPhone}`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointment.intakeNote && (
            <p className="whitespace-pre-wrap text-sm">{appointment.intakeNote}</p>
          )}
          {data.reports.length > 0 && (
            <div className="space-y-1">
              {data.reports.map((report) => (
                <a
                  key={report.id}
                  href={`/api/reports/${report.id}`}
                  target="_blank"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {report.filename}
                </a>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <JoinCallButton
              appointmentId={appointment.id}
              status={appointment.status}
              startsAt={appointment.startsAt.toISOString()}
              endsAt={appointment.endsAt.toISOString()}
            />
            {appointment.status === "confirmed" && (
              <OutcomeButtons
                appointmentId={appointment.id}
                hasNote={Boolean(
                  data.note?.subjective ||
                    data.note?.objective ||
                    data.note?.assessment ||
                    data.note?.plan
                )}
                prescriptionDraft={data.prescription?.status === "draft"}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <SoapEditor appointmentId={appointment.id} initialNote={data.note} />
          <PrescriptionComposer
            appointmentId={appointment.id}
            initial={
              data.prescription
                ? {
                    status: data.prescription.status,
                    diagnosis: data.prescription.diagnosis,
                    advice: data.prescription.advice,
                    validUntil: data.prescription.validUntil,
                    issuedAt: data.prescription.issuedAt,
                    medicines: data.prescription.medicines,
                  }
                : null
            }
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Past consultations</CardTitle>
              {!isReturning && (
                <CardDescription>
                  First visit — no history with this patient yet.
                </CardDescription>
              )}
            </CardHeader>
            {isReturning && (
              <CardContent className="space-y-4">
                {history.map(({ appointment: past, note, prescription }) => (
                  <div key={past.id} className="space-y-2 rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {formatInTimeZone(past.startsAt, timezone, "MMM d, yyyy")}
                    </p>
                    {past.intakeNote && (
                      <p className="line-clamp-2 text-muted-foreground">{past.intakeNote}</p>
                    )}
                    {note?.assessment && (
                      <p>
                        <span className="text-muted-foreground">Assessment: </span>
                        {note.assessment}
                      </p>
                    )}
                    {prescription && (
                      <div>
                        <p className="text-muted-foreground">
                          Prescribed
                          {prescription.diagnosis ? ` (${prescription.diagnosis})` : ""}:
                        </p>
                        <ul className="ml-4 list-disc">
                          {prescription.medicines.map((med) => (
                            <li key={med.id}>
                              {med.name}
                              {med.strength ? ` ${med.strength}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {medicineHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Medicine history</CardTitle>
                <CardDescription>
                  Everything you&apos;ve issued this patient, newest first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {medicineHistory.map(({ medicine, issuedAt }) => (
                  <div key={medicine.id} className="rounded-md border p-3">
                    <p className="font-medium">
                      {medicine.name}
                      {medicine.strength && (
                        <span className="text-muted-foreground"> {medicine.strength}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {describeMedicineSchedule(medicine)}
                    </p>
                    {issuedAt && (
                      <p className="text-xs text-muted-foreground">
                        Issued {formatInTimeZone(issuedAt, timezone, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
