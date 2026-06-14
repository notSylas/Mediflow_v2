import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  FileText,
  Pill,
  Stethoscope,
  UserPen,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";
import { listPatientAppointments } from "@/lib/appointments";
import { listPatientPrescriptions } from "@/lib/consult";
import { getPatientProfile } from "@/lib/patient";
import { cn } from "@/lib/utils";
import { TONES } from "@/lib/tones";
import { JoinCallButton } from "@/components/JoinCallButton";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { ProgressBar } from "@/components/ProgressBar";
import { SpotlightCard } from "@/components/wow/SpotlightCard";
import { MagneticButton } from "@/components/wow/MagneticButton";
import { ShineBorder } from "@/components/wow/ShineBorder";
import { CountdownRing } from "@/components/wow/CountdownRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  const [rows, profile, patientProfile, prescriptions, doctor] = await Promise.all([
    listPatientAppointments(session.user.id),
    getDoctorProfile(),
    getPatientProfile(session.user.id),
    listPatientPrescriptions(session.user.id),
    getDoctorCard(),
  ]);

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

  // Profile completeness across the fields the doctor cares about.
  const fields = [
    patientProfile?.dateOfBirth,
    patientProfile?.gender,
    patientProfile?.bloodGroup,
    patientProfile?.allergies,
    patientProfile?.chronicConditions,
    patientProfile?.currentMedications,
    patientProfile?.emergencyContactName,
  ];
  const filled = fields.filter(Boolean).length;
  const profilePct = Math.round((filled / fields.length) * 100);

  const firstName = session.user.name?.split(" ")[0];
  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : "Your doctor";

  const stats = [
    { icon: CalendarCheck2, label: "Upcoming", value: upcomingCount, tone: "blue" as const },
    { icon: CheckCircle2, label: "Consultations", value: completedCount, tone: "emerald" as const },
    { icon: FileText, label: "Prescriptions", value: prescriptions.length, tone: "violet" as const },
    { icon: UserPen, label: "Profile", value: profilePct, suffix: "%", tone: "amber" as const },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {formatInTimeZone(now, timezone, "EEEE, MMMM d")}
          </p>
        </div>
        <MagneticButton>
          <Button asChild size="lg">
            <Link href="/patient/book">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Book a visit
            </Link>
          </Button>
        </MagneticButton>
      </Reveal>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 70}>
            <SpotlightCard className={cn("hover-lift rounded-xl p-4", TONES[stat.tone].tile)}>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  TONES[stat.tone].chip
                )}
              >
                <stat.icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                <CountUp value={stat.value} suffix={stat.suffix ?? ""} />
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>

      {/* Bento */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Reveal>
            <ShineBorder>
            <Card className="glass overflow-hidden rounded-2xl border-0">
              <div className="h-1 bg-primary" />
              <CardHeader>
                <CardTitle>Next appointment</CardTitle>
              </CardHeader>
              <CardContent>
                {next ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Stethoscope className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-semibold">
                            {formatInTimeZone(next.appointment.startsAt, timezone, "EEEE, MMM d 'at' h:mm a")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            with {doctorName} ·{" "}
                            <span className="font-medium text-primary">
                              {relativeWhen(next.appointment.startsAt, now, timezone)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={next.appointment.status === "confirmed" ? "default" : "outline"}
                        >
                          {next.appointment.status === "pending_payment"
                            ? "Awaiting payment"
                            : "Confirmed"}
                        </Badge>
                        <CountdownRing
                          startsAt={next.appointment.startsAt.toISOString()}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CalendarX2 className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-medium">No upcoming appointments</p>
                      <p className="text-sm text-muted-foreground">
                        Book a consultation and it&apos;ll show up here.
                      </p>
                    </div>
                    <Button asChild className="mt-1">
                      <Link href="/patient/book">Book a consultation</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            </ShineBorder>
          </Reveal>

          <Reveal delay={100}>
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Recent prescriptions</CardTitle>
                {prescriptions.length > 0 && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/patient/prescriptions">
                      View all
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {prescriptions.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Your prescriptions will appear here after consultations.
                  </p>
                )}
                {prescriptions.slice(0, 3).map(({ prescription, appointment, medicines }) => (
                  <Link
                    key={prescription.id}
                    href={`/patient/appointments/${appointment.id}`}
                    className="flex items-center gap-3 rounded-lg border bg-background/50 p-3 transition-colors hover:border-primary/40"
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES.violet.chip)}>
                      <Pill className="h-4 w-4" />
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
          </Reveal>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Reveal delay={60}>
            <Card className="glass hover-lift">
              <CardHeader>
                <CardTitle className="text-base">Your doctor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-semibold uppercase text-primary-foreground">
                    {(doctor?.name || "Dr").slice(0, 2)}
                  </span>
                  <div>
                    <p className="font-medium">{doctorName}</p>
                    <p className="text-sm text-muted-foreground">
                      {doctor?.specialty ?? "General physician"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Consultation</span>
                  <span className="font-medium">
                    ₹{((doctor?.feeInPaise ?? 50000) / 100).toFixed(0)} ·{" "}
                    {doctor?.slotMinutes ?? 20} min
                  </span>
                </div>
                <Button asChild className="w-full">
                  <Link href="/patient/book">
                    Book a visit
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={140}>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Medical profile</CardTitle>
                <CardDescription>
                  {profilePct === 100
                    ? "All set — your doctor has what they need."
                    : "Help your doctor treat you safely."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completeness</span>
                  <span className="font-medium tabular-nums">{profilePct}%</span>
                </div>
                <ProgressBar value={profilePct} />
                {profilePct < 100 && (
                  <Button asChild variant="outline" className="mt-1 w-full">
                    <Link href="/patient/profile">
                      <UserPen className="mr-2 h-4 w-4" />
                      Complete your profile
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
