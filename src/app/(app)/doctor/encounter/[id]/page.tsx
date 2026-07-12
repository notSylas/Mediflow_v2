import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, FileText, RotateCcw } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { followUps } from "@/db/schema";
import {
  getEncounterData,
  getMedicineHistory,
  getPatientHistory,
} from "@/lib/consult/consult";
import { describeMedicineSchedule } from "@/lib/consult/medicines";
import { ageFromDob, genderLabel, getPatientProfile } from "@/lib/people/patient";
import { getOrCreateDoctorProfile } from "@/lib/people/doctor";
import { createFollowUpAction } from "@/app/(app)/doctor/actions";
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
import { statusLabel } from "@/lib/booking/appointment-status";

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
  const [history, medicineHistory, patientProfile, followUp] = await Promise.all([
    getPatientHistory(data.patient.id, data.doctorProfileId, id),
    getMedicineHistory(data.patient.id, data.doctorProfileId),
    getPatientProfile(data.patient.id),
    db
      .select()
      .from(followUps)
      .where(
        and(
          eq(followUps.sourceAppointmentId, id),
          eq(followUps.status, "pending")
        )
      )
      .then((rows) => rows[0] ?? null),
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
      <Link
        href="/doctor/appointments"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All appointments
      </Link>

      {/* Frosted glass patient-context strip (docs/Design.md) — the one
          glass surface on this screen besides the Rx panel below. SOAP
          fields and history stay flat per the "doctor is in a hurry"
          scope rule; this strip is the highest-stakes identity moment. */}
      <div className="glass-frost flex flex-wrap items-center gap-3 px-5 py-4">
        <h1 className="text-2xl font-semibold">{data.patient.name}</h1>
        <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
          {statusLabel(appointment.status, "doctor")}
        </Badge>
        {isReturning && <Badge variant="outline">Returning patient</Badge>}
        {appointment.status === "confirmed" && (
          <PresenceBadge appointmentId={appointment.id} />
        )}
        <p className="ml-auto text-sm text-muted-foreground">
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
                followUpRecommended={Boolean(followUp)}
                triageFlagged={Boolean(appointment.triageFlaggedAt)}
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
            className="glass-rx-panel"
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
              <CardTitle>Completion checklist</CardTitle>
              <CardDescription>
                Close the loop before marking the consultation complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                {
                  label: "SOAP note saved",
                  done: Boolean(
                    data.note?.subjective ||
                      data.note?.objective ||
                      data.note?.assessment ||
                      data.note?.plan
                  ),
                },
                {
                  label:
                    data.prescription?.status === "issued"
                      ? "Prescription issued"
                      : data.prescription?.status === "draft"
                        ? "Prescription still in draft"
                        : "Prescription skipped/not started",
                  done: data.prescription?.status === "issued",
                },
                {
                  label: followUp
                    ? `Follow-up due ${formatInTimeZone(followUp.dueAt, timezone, "MMM d")}`
                    : "Follow-up decision pending",
                  done: Boolean(followUp),
                },
                {
                  label: appointment.triageFlaggedAt
                    ? "Red-flag intake reviewed"
                    : "No triage red flag",
                  done: !appointment.triageFlaggedAt,
                  warn: Boolean(appointment.triageFlaggedAt),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg border bg-background/60 p-2.5"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : item.warn ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border" />
                  )}
                  <span className={item.done ? "" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up recommendation</CardTitle>
              <CardDescription>
                Surface continuity on the patient home screen and doctor work queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {followUp ? (
                <div className="flex items-start gap-3 rounded-lg border bg-emerald-50 p-3 text-sm">
                  <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-medium text-emerald-900">
                      Recommended for{" "}
                      {formatInTimeZone(followUp.dueAt, timezone, "MMM d, yyyy")}
                    </p>
                    <p className="text-emerald-800/80">
                      The patient will see a follow-up prompt until they book or dismiss it.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((days) => (
                    <form key={days} action={createFollowUpAction}>
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <input type="hidden" name="inDays" value={days} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border bg-background/60 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/50"
                      >
                        {days} days
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
