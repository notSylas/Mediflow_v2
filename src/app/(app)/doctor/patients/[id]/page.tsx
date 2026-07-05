import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileText,
  HandHeart,
  HeartPulse,
  Mail,
  MessageCircle,
  Pill,
  RotateCcw,
  Stethoscope,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  conversations,
  followUps,
  medicalReports,
  refillRequests,
  user,
} from "@/db/schema";
import { listDoctorPatients } from "@/lib/appointments";
import { getMedicineHistory, getPatientHistory } from "@/lib/consult";
import { describeMedicineSchedule } from "@/lib/medicines";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { ageFromDob, genderLabel, getPatientProfile } from "@/lib/patient";
import { getDoctorPatientCareStatus } from "@/lib/care-subscription";
import { cn } from "@/lib/utils";
import { TONES } from "@/lib/tones";
import { startAsyncConsultAction as startWebAsyncConsultAction } from "@/app/(app)/doctor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Field({
  label,
  value,
  warn,
}: {
  label: string;
  value?: string | null;
  warn?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-background/60 p-3", warn && "border-destructive/40 bg-destructive/5")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-sm", !value && "text-muted-foreground")}>
        {value || "Not provided"}
      </p>
    </div>
  );
}

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(session.user.id);
  const roster = await listDoctorPatients(profile.id);
  if (!roster.some(({ patient }) => patient.id === id)) notFound();

  const [patient] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, id));
  if (!patient) notFound();

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
    getPatientHistory(patient.id, profile.id),
    getMedicineHistory(patient.id, profile.id),
    getPatientProfile(patient.id),
    db
      .select({
        id: followUps.id,
        dueAt: followUps.dueAt,
        status: followUps.status,
        createdAt: followUps.createdAt,
        sourceAppointmentId: followUps.sourceAppointmentId,
      })
      .from(followUps)
      .where(and(eq(followUps.patientId, patient.id), eq(followUps.doctorId, profile.id)))
      .orderBy(desc(followUps.createdAt)),
    db
      .select({
        id: refillRequests.id,
        prescriptionId: refillRequests.prescriptionId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
      })
      .from(refillRequests)
      .where(and(eq(refillRequests.patientId, patient.id), eq(refillRequests.doctorId, profile.id)))
      .orderBy(desc(refillRequests.createdAt)),
    db
      .select({
        id: medicalReports.id,
        filename: medicalReports.filename,
        mimeType: medicalReports.mimeType,
        createdAt: medicalReports.createdAt,
      })
      .from(medicalReports)
      .where(eq(medicalReports.patientId, patient.id))
      .orderBy(desc(medicalReports.createdAt)),
    db
      .select({
        id: conversations.id,
        lastMessageAt: conversations.lastMessageAt,
        lastMessagePreview: conversations.lastMessagePreview,
        doctorUnread: conversations.doctorUnread,
      })
      .from(conversations)
      .where(and(eq(conversations.patientId, patient.id), eq(conversations.doctorId, profile.id)))
      .then((rows) => rows[0] ?? null),
    getDoctorPatientCareStatus(patient.id, profile.id),
  ]);

  const timezone = profile.timezone;
  const displayName = patient.name || patient.email;
  const age = ageFromDob(patientProfile?.dateOfBirth ?? null);
  const snapshot = [
    age !== null ? `${age} years` : null,
    genderLabel(patientProfile?.gender ?? null),
    patientProfile?.bloodGroup ? `Blood ${patientProfile.bloodGroup}` : null,
  ].filter(Boolean);

  const pendingFollowUps = followUpHistory.filter((item) => item.status === "pending");
  const pendingRefills = refillHistory.filter((item) => item.status === "pending");
  const timeline = [
    ...history.map(({ appointment, note, prescription }) => ({
      key: `visit-${appointment.id}`,
      at: appointment.startsAt,
      icon: Stethoscope,
      title: prescription?.diagnosis ?? note?.assessment ?? "Consultation completed",
      meta: formatInTimeZone(appointment.startsAt, timezone, "MMM d, yyyy"),
      body:
        appointment.intakeNote ||
        prescription?.medicines.map((medicine) => medicine.name).join(", ") ||
        "Completed visit",
      href: `/doctor/encounter/${appointment.id}`,
      tone: "teal" as const,
    })),
    ...reports.map((report) => ({
      key: `report-${report.id}`,
      at: report.createdAt,
      icon: FileText,
      title: report.filename,
      meta: "Report uploaded",
      body: report.mimeType,
      href: `/api/reports/${report.id}`,
      tone: "blue" as const,
    })),
    ...followUpHistory.map((followUp) => ({
      key: `follow-${followUp.id}`,
      at: followUp.createdAt,
      icon: RotateCcw,
      title: `Follow-up ${followUp.status}`,
      meta: `Due ${formatInTimeZone(followUp.dueAt, timezone, "MMM d, yyyy")}`,
      body: "Doctor-recommended continuity check",
      href: followUp.sourceAppointmentId
        ? `/doctor/encounter/${followUp.sourceAppointmentId}`
        : "/doctor/work-queue",
      tone: "emerald" as const,
    })),
    ...refillHistory.map((refill) => ({
      key: `refill-${refill.id}`,
      at: refill.createdAt,
      icon: Pill,
      title: `Refill request ${refill.status}`,
      meta: formatInTimeZone(refill.createdAt, timezone, "MMM d, yyyy"),
      body: "Patient requested continuation of a previous prescription",
      href: "/doctor/refill-requests",
      tone: "violet" as const,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-6xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <Link
          href="/doctor/patients"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All patients
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-medium uppercase text-accent-foreground">
              {displayName.slice(0, 2)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
                {care.active && (
                  <Badge className="border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-100">
                    <HandHeart className="mr-1 h-3.5 w-3.5" />
                    Care member
                  </Badge>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {patient.email}
              </p>
              {snapshot.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {snapshot.join(" · ")}
                </p>
              )}
              {care.active && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Messaging enabled ·{" "}
                  {care.followUpAvailable
                    ? "follow-up credit available"
                    : "follow-up used this period"}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/messages">
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
                {conversation?.doctorUnread ? (
                  <Badge className="ml-2">{conversation.doctorUnread}</Badge>
                ) : null}
              </Link>
            </Button>
            <form action={startWebAsyncConsultAction}>
              <input type="hidden" name="patientId" value={patient.id} />
              <input type="hidden" name="visitReason" value="Doctor follow-up" />
              <Button type="submit">
                <FileText className="mr-2 h-4 w-4" />
                Start async consult
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Visits", value: history.length, icon: CalendarClock, tone: "teal" as const },
          { label: "Medicines", value: medicineHistory.length, icon: Pill, tone: "violet" as const },
          { label: "Reports", value: reports.length, icon: FileText, tone: "blue" as const },
          { label: "Follow-ups", value: pendingFollowUps.length, icon: RotateCcw, tone: "emerald" as const },
          { label: "Refills", value: pendingRefills.length, icon: HeartPulse, tone: "amber" as const },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl p-4", TONES[stat.tone].tile)}>
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONES[stat.tone].chip)}>
              <stat.icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Clinical snapshot</CardTitle>
              <CardDescription>
                Critical context before prescribing or continuing treatment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {!patientProfile && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground sm:col-span-2">
                  This patient has not filled in their medical profile yet.
                </div>
              )}
              <Field
                label="Allergies"
                value={patientProfile?.allergies}
                warn={Boolean(patientProfile?.allergies)}
              />
              <Field label="Chronic conditions" value={patientProfile?.chronicConditions} />
              <Field label="Current medicines" value={patientProfile?.currentMedications} />
              <Field
                label="Emergency contact"
                value={
                  patientProfile?.emergencyContactName
                    ? `${patientProfile.emergencyContactName}${
                        patientProfile.emergencyContactPhone
                          ? ` · ${patientProfile.emergencyContactPhone}`
                          : ""
                      }`
                    : null
                }
              />
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Patient timeline</CardTitle>
              {timeline.length === 0 && (
                <CardDescription>No clinical activity has been recorded yet.</CardDescription>
              )}
            </CardHeader>
            {timeline.length > 0 && (
              <CardContent className="space-y-3">
                {timeline.slice(0, 12).map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES[item.tone].chip)}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="block text-sm text-muted-foreground">{item.meta}</span>
                      <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {(pendingFollowUps.length > 0 || pendingRefills.length > 0 || conversation?.doctorUnread) && (
            <Card className="glass border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Open actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {pendingFollowUps.length > 0 && (
                  <Link href="/doctor/work-queue" className="block rounded-lg border bg-background/60 p-3 hover:border-primary/40">
                    {pendingFollowUps.length} follow-up{pendingFollowUps.length === 1 ? "" : "s"} not booked
                  </Link>
                )}
                {pendingRefills.length > 0 && (
                  <Link href="/doctor/refill-requests" className="block rounded-lg border bg-background/60 p-3 hover:border-primary/40">
                    {pendingRefills.length} pending refill request{pendingRefills.length === 1 ? "" : "s"}
                  </Link>
                )}
                {conversation?.doctorUnread ? (
                  <Link href="/messages" className="block rounded-lg border bg-background/60 p-3 hover:border-primary/40">
                    {conversation.doctorUnread} unread message{conversation.doctorUnread === 1 ? "" : "s"}
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card className="glass">
            <CardHeader>
              <CardTitle>Medicine history</CardTitle>
              {medicineHistory.length === 0 && (
                <CardDescription>No medicines issued yet.</CardDescription>
              )}
            </CardHeader>
            {medicineHistory.length > 0 && (
              <CardContent className="space-y-3 text-sm">
                {medicineHistory.slice(0, 8).map(({ medicine, issuedAt }) => (
                  <div key={medicine.id} className="rounded-lg border bg-background/60 p-3">
                    <p className="font-medium">
                      {medicine.name}
                      {medicine.strength && (
                        <span className="text-muted-foreground"> {medicine.strength}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground">{describeMedicineSchedule(medicine)}</p>
                    {issuedAt && (
                      <p className="text-xs text-muted-foreground">
                        Issued {formatInTimeZone(issuedAt, timezone, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              {reports.length === 0 && (
                <CardDescription>No uploaded reports for this patient.</CardDescription>
              )}
            </CardHeader>
            {reports.length > 0 && (
              <CardContent className="space-y-2">
                {reports.slice(0, 8).map((report) => (
                  <a
                    key={report.id}
                    href={`/api/reports/${report.id}`}
                    target="_blank"
                    className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 text-sm hover:border-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{report.filename}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatInTimeZone(report.createdAt, timezone, "MMM d, yyyy")}
                      </span>
                    </span>
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
