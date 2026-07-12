import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  FileText,
  HeartPulse,
  MessageCircle,
  Pill,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  UserPen,
  Video,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getDoctorCard, getDoctorProfile } from "@/lib/people/doctor";
import { listPatientAppointments } from "@/lib/booking/appointments";
import { listPatientPrescriptions } from "@/lib/consult/consult";
import { getPatientPendingFollowUp } from "@/lib/care/follow-ups";
import { getPatientProfile } from "@/lib/people/patient";
import { getPatientCareStatus, toCareStatusDTO } from "@/lib/care/care-subscription";
import { describeMedicineSchedule } from "@/lib/consult/medicines";
import { CareCard } from "@/components/patient/CareCard";
import { dismissFollowUpAction } from "@/app/(app)/patient/actions";
import { JoinCallButton } from "@/components/common/JoinCallButton";
import { Reveal } from "@/components/effects/Reveal";
import { CountUp } from "@/components/effects/CountUp";
import { ProgressBar } from "@/components/effects/ProgressBar";
import { CountdownRing } from "@/components/effects/CountdownRing";
import {
  PatientEmptyState,
  PatientHero,
  PatientPageShell,
  PatientSection,
  PatientSideCard,
  PatientStatCard,
} from "@/components/patient/PatientPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function relativeWhen(startsAt: Date, now: Date, timezone: string): string {
  const ms = startsAt.getTime() - now.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${Math.max(mins, 0)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const apptKey = formatInTimeZone(startsAt, timezone, "yyyy-MM-dd");
  if (apptKey === todayKey) return "today";
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export default async function PatientHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [rows, profile, patientProfile, prescriptions, doctor, followUp, careStatus] =
    await Promise.all([
      listPatientAppointments(session.user.id),
      getDoctorProfile(),
      getPatientProfile(session.user.id),
      listPatientPrescriptions(session.user.id),
      getDoctorCard(),
      getPatientPendingFollowUp(session.user.id),
      getPatientCareStatus(session.user.id),
    ]);
  const care = toCareStatusDTO(careStatus);

  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const now = new Date();

  const next = rows
    .filter(
      ({ appointment }) =>
        ["pending_payment", "confirmed"].includes(appointment.status) &&
        appointment.endsAt > now
    )
    .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime())[0];

  const upcomingCount = rows.filter(
    ({ appointment }) => appointment.status === "confirmed" && appointment.endsAt > now
  ).length;
  const completedCount = rows.filter(
    ({ appointment }) => appointment.status === "completed"
  ).length;

  const fields = [
    patientProfile?.dateOfBirth,
    patientProfile?.gender,
    patientProfile?.bloodGroup,
    patientProfile?.allergies,
    patientProfile?.chronicConditions,
    patientProfile?.currentMedications,
    patientProfile?.emergencyContactName,
  ];
  const profilePct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const firstName = session.user.name?.split(" ")[0];
  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : "Your doctor";
  const DAY_MS = 86_400_000;
  const activeMedications = prescriptions
    .filter((row) => row.prescription.issuedAt)
    .flatMap((row) => {
      const issuedAt = row.prescription.issuedAt;
      if (!issuedAt) return [];
      const issuedMs = issuedAt.getTime();
      return row.medicines.filter((medicine) => {
        if (medicine.durationDays == null) return true;
        return issuedMs + medicine.durationDays * DAY_MS >= now.getTime();
      });
    });
  const pendingPayment = rows.find(
    ({ appointment }) =>
      appointment.status === "pending_payment" &&
      appointment.holdExpiresAt &&
      appointment.holdExpiresAt > now
  );

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Patient portal"
          icon={HeartPulse}
          title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
          description="Manage consultations, prescriptions, follow-ups, and your medical profile from one secure care workspace."
          actions={
            <>
              <Button asChild size="lg" className="bg-white text-teal-900 hover:bg-teal-50">
                <Link href="/patient/book">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Book a consultation
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/messages">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message doctor
                </Link>
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-teal-50/80">Today</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatInTimeZone(now, timezone, "EEEE, MMMM d")}
                </p>
              </div>
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                Secure clinic
              </Badge>
            </div>

            <div className="rounded-2xl bg-white p-4 text-foreground shadow-xl shadow-teal-950/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next visit</p>
                  {next ? (
                    <>
                      <p className="mt-1 font-semibold">
                        {formatInTimeZone(next.appointment.startsAt, timezone, "EEE, MMM d")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatInTimeZone(next.appointment.startsAt, timezone, "h:mm a")} ·{" "}
                        {relativeWhen(next.appointment.startsAt, now, timezone)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No appointment booked</p>
                  )}
                </div>
                {next ? (
                  <CountdownRing startsAt={next.appointment.startsAt.toISOString()} />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <CalendarX2 className="h-6 w-6" />
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {next?.appointment.status === "confirmed" && (
                  <JoinCallButton
                    appointmentId={next.appointment.id}
                    status={next.appointment.status}
                    startsAt={next.appointment.startsAt.toISOString()}
                    endsAt={next.appointment.endsAt.toISOString()}
                  />
                )}
                {next ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/patient/appointments/${next.appointment.id}`}>Visit details</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/patient/book">Find a time</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </PatientHero>
      </Reveal>

      <Reveal delay={40}>
        <CareCard care={care} timezone={timezone} />
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: CalendarCheck2,
            label: "Upcoming",
            value: upcomingCount,
            description: "confirmed visits",
          },
          {
            icon: CheckCircle2,
            label: "Consultations",
            value: completedCount,
            description: "completed with your clinic",
          },
          {
            icon: FileText,
            label: "Prescriptions",
            value: prescriptions.length,
            description: "issued and saved",
          },
          {
            icon: UserPen,
            label: "Profile",
            value: `${profilePct}%`,
            description: "medical profile complete",
          },
        ].map((stat, index) => (
          <Reveal key={stat.label} delay={index * 60}>
            <PatientStatCard
              icon={stat.icon}
              label={stat.label}
              value={
                typeof stat.value === "number" ? <CountUp value={stat.value} /> : stat.value
              }
              description={stat.description}
            />
          </Reveal>
        ))}
      </div>

      {(followUp || profilePct < 100 || pendingPayment) && (
        <PatientSection
          title="Needs your attention"
          description="Small actions that make consultations safer and smoother."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {followUp && (
              <Card className="glass rounded-2xl border-emerald-200 bg-emerald-50/70">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <RotateCcw className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">Follow-up recommended</p>
                      <p className="text-sm text-muted-foreground">
                        Your doctor wants a check-in around{" "}
                        {formatInTimeZone(followUp.dueAt, timezone, "MMM d")}.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href="/patient/book">Book follow-up</Link>
                    </Button>
                    <form action={dismissFollowUpAction}>
                      <input type="hidden" name="followUpId" value={followUp.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Dismiss
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )}

            {pendingPayment && (
              <Card className="glass rounded-2xl border-amber-200 bg-amber-50/70">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <CalendarPlus className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Payment is pending</p>
                    <p className="text-sm text-muted-foreground">
                      Complete payment to confirm your slot.
                    </p>
                    <Button asChild variant="link" className="mt-1 h-auto p-0">
                      <Link href={`/patient/appointments/${pendingPayment.appointment.id}`}>
                        View booking
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {profilePct < 100 && (
              <Card className="glass rounded-2xl">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Complete your medical profile</p>
                    <p className="text-sm text-muted-foreground">
                      Allergies, conditions, and current medicines help your doctor prescribe safely.
                    </p>
                    <Button asChild variant="link" className="mt-1 h-auto p-0">
                      <Link href="/patient/profile">Continue profile</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </PatientSection>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Reveal>
            <PatientSection
              title="Next appointment"
              description="Your upcoming consultation and visit actions."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/patient/appointments">
                    All visits
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            >
              <Card className="glass overflow-hidden rounded-3xl">
                <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400" />
                <CardContent className="p-6">
                  {next ? (
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="flex items-start gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                          <Stethoscope className="h-6 w-6" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold">
                              {formatInTimeZone(next.appointment.startsAt, timezone, "EEEE, MMM d 'at' h:mm a")}
                            </p>
                            <Badge
                              variant={next.appointment.status === "confirmed" ? "default" : "outline"}
                            >
                              {next.appointment.status === "pending_payment"
                                ? "Awaiting payment"
                                : "Confirmed"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            with {doctorName} ·{" "}
                            <span className="font-medium text-primary">
                              {relativeWhen(next.appointment.startsAt, now, timezone)}
                            </span>
                          </p>
                          {next.appointment.intakeNote && (
                            <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                              {next.appointment.intakeNote}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {next.appointment.status === "confirmed" && (
                              <JoinCallButton
                                appointmentId={next.appointment.id}
                                status={next.appointment.status}
                                startsAt={next.appointment.startsAt.toISOString()}
                                endsAt={next.appointment.endsAt.toISOString()}
                              />
                            )}
                            <Button asChild variant="outline">
                              <Link href={`/patient/appointments/${next.appointment.id}`}>
                                View details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CountdownRing startsAt={next.appointment.startsAt.toISOString()} />
                    </div>
                  ) : (
                    <PatientEmptyState
                      icon={CalendarX2}
                      title="No upcoming appointment"
                      description="Book a consultation and the full visit card will appear here with video, payment, and prescription actions."
                      action={
                        <Button asChild>
                          <Link href="/patient/book">Book a consultation</Link>
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </PatientSection>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal delay={90}>
              <PatientSection
                title="Recent prescriptions"
                description="Medicines and advice issued by your doctor."
                action={
                  prescriptions.length > 0 && (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/patient/prescriptions">
                        View all
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )
                }
              >
                <Card className="glass rounded-2xl">
                  <CardContent className="space-y-3 p-4">
                    {prescriptions.length === 0 && (
                      <PatientEmptyState
                        icon={FileText}
                        title="No prescriptions yet"
                        description="Issued prescriptions will appear here after consultations."
                        action={
                          <Button asChild variant="outline">
                            <Link href="/patient/book">Book a visit</Link>
                          </Button>
                        }
                      />
                    )}
                    {prescriptions.slice(0, 3).map(({ prescription, appointment, medicines }) => (
                      <Link
                        key={prescription.id}
                        href={`/patient/appointments/${appointment.id}`}
                        className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3 transition-colors hover:border-primary/40"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <Pill className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {prescription.diagnosis ?? "Consultation"}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {medicines.map((m) => m.name).join(", ") || "No medicines"}
                          </span>
                        </span>
                        {prescription.issuedAt && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatInTimeZone(prescription.issuedAt, timezone, "MMM d")}
                          </span>
                        )}
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </PatientSection>
            </Reveal>

            <Reveal delay={140}>
              <PatientSection
                title="Active medicines"
                description="Courses still active based on issue date and duration."
                action={
                  activeMedications.length > 0 && (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/patient/prescriptions">View Rx</Link>
                    </Button>
                  )
                }
              >
                <Card className="glass rounded-2xl">
                  <CardContent className="space-y-3 p-4">
                    {activeMedications.length === 0 && (
                      <PatientEmptyState
                        icon={Pill}
                        title="No active medicines"
                        description="Current courses will show here with dosage timing."
                      />
                    )}
                    {activeMedications.slice(0, 4).map((medicine) => (
                      <div
                        key={medicine.id}
                        className="flex items-start gap-3 rounded-2xl border bg-background/60 p-3"
                      >
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <Pill className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {medicine.name}
                            {medicine.strength && (
                              <span className="ml-1.5 font-normal text-muted-foreground">
                                {medicine.strength}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {describeMedicineSchedule(medicine)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </PatientSection>
            </Reveal>
          </div>
        </div>

        <aside className="space-y-6">
          <Reveal delay={70}>
            <PatientSideCard title="Your doctor" description="Assigned clinic physician">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-base font-semibold uppercase text-primary-foreground">
                  {(doctor?.name || "Dr").slice(0, 2)}
                </span>
                <div>
                  <p className="font-semibold">{doctorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {doctor?.specialty ?? "General physician"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-background/60 p-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Fee</p>
                  <p className="font-semibold">
                    ₹{((doctor?.feeInPaise ?? 50000) / 100).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-semibold">{doctor?.slotMinutes ?? 20} min</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/patient/book">
                  Book a visit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </PatientSideCard>
          </Reveal>

          <Reveal delay={120}>
            <PatientSideCard
              title="Medical profile"
              description={
                profilePct === 100
                  ? "Your doctor has the key safety details."
                  : "Add allergies and ongoing conditions before the visit."
              }
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completeness</span>
                  <span className="font-semibold tabular-nums">{profilePct}%</span>
                </div>
                <ProgressBar value={profilePct} />
              </div>
              <Button asChild variant={profilePct === 100 ? "outline" : "default"} className="w-full">
                <Link href="/patient/profile">
                  <UserPen className="mr-2 h-4 w-4" />
                  {profilePct === 100 ? "Review profile" : "Complete profile"}
                </Link>
              </Button>
            </PatientSideCard>
          </Reveal>

          <Reveal delay={170}>
            <PatientSideCard title="Care shortcuts" description="Common actions in one place">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/messages">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message your doctor
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/patient/appointments">
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Visit history
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/patient/appointments">
                  <Video className="mr-2 h-4 w-4" />
                  Video visit readiness
                </Link>
              </Button>
            </PatientSideCard>
          </Reveal>
        </aside>
      </div>
    </PatientPageShell>
  );
}
