import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Settings,
  Stethoscope,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { cn } from "@/lib/utils";
import { TONES } from "@/lib/tones";
import { db } from "@/db";
import { availabilityRules } from "@/db/schema";
import { auth } from "@/lib/auth";
import { listDoctorAppointments } from "@/lib/appointments";
import { getDoctorRevenueInPaise, getOrCreateDoctorProfile } from "@/lib/doctor";
import { JoinCallButton } from "@/components/JoinCallButton";
import { PresenceBadge } from "@/components/PresenceBadge";
import { SpotlightCard } from "@/components/wow/SpotlightCard";
import { ShineBorder } from "@/components/wow/ShineBorder";
import { CountdownRing } from "@/components/wow/CountdownRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DoctorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const [rows, revenueInPaise, rules] = await Promise.all([
    listDoctorAppointments(profile.id),
    getDoctorRevenueInPaise(profile.id),
    db
      .select({ id: availabilityRules.id })
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .limit(1),
  ]);

  const setupSteps = [
    {
      label: "Complete your profile",
      description: "Specialty, bio and consultation fee — patients see these.",
      href: "/doctor/settings",
      done: Boolean(profile.specialty),
    },
    {
      label: "Add weekly availability",
      description: "Patients can only book inside these hours.",
      href: "/doctor/settings",
      done: rules.length > 0,
    },
    {
      label: "Get your first booking",
      description: "Share the site with a patient — bookings appear below.",
      href: "/doctor/appointments",
      done: rows.length > 0,
    },
  ];
  const setupRemaining = setupSteps.filter((step) => !step.done).length;

  const timezone = profile.timezone;
  const now = new Date();
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");

  const todayRows = rows
    .filter(
      ({ appointment }) =>
        formatInTimeZone(appointment.startsAt, timezone, "yyyy-MM-dd") === todayKey &&
        ["confirmed", "completed"].includes(appointment.status)
    )
    .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime());

  const upcomingCount = rows.filter(
    ({ appointment }) =>
      appointment.status === "confirmed" && appointment.startsAt > now
  ).length;

  const completedCount = rows.filter(
    ({ appointment }) => appointment.status === "completed"
  ).length;

  const nextUp = rows
    .filter(
      ({ appointment }) =>
        appointment.status === "confirmed" && appointment.endsAt > now
    )
    .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime())[0];

  const doctorName = session.user.name || session.user.email.split("@")[0];

  const stats = [
    { icon: CalendarClock, label: "Today", value: String(todayRows.length), tone: "blue" as const },
    { icon: CalendarDays, label: "Upcoming", value: String(upcomingCount), tone: "violet" as const },
    { icon: CheckCircle2, label: "Completed", value: String(completedCount), tone: "emerald" as const },
    {
      icon: IndianRupee,
      label: "Collected",
      value: `₹${(revenueInPaise / 100).toLocaleString("en-IN")}`,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-6xl space-y-8 px-4 py-10 duration-500 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hello, Dr. {doctorName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {formatInTimeZone(now, timezone, "EEEE, MMMM d")} — here&apos;s your clinic at a glance.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/doctor/settings">
            <Settings className="mr-2 h-4 w-4" />
            Profile & availability
          </Link>
        </Button>
      </div>

      {setupRemaining > 0 && (
        <Card className="glass border-primary/30">
          <CardHeader>
            <CardTitle>Finish setting up your clinic</CardTitle>
            <CardDescription>
              {setupSteps.length - setupRemaining} of {setupSteps.length} done — patients
              can book once availability is live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {setupSteps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
              >
                <span
                  className={
                    step.done
                      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border"
                  }
                >
                  {step.done && <CheckCircle2 className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span
                    className={
                      step.done
                        ? "block font-medium text-muted-foreground line-through"
                        : "block font-medium"
                    }
                  >
                    {step.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {step.description}
                  </span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <SpotlightCard
            key={stat.label}
            className={cn("hover-lift rounded-xl p-4", TONES[stat.tone].tile)}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                TONES[stat.tone].chip
              )}
            >
              <stat.icon className="h-4.5 w-4.5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </SpotlightCard>
        ))}
      </div>

      <ShineBorder>
      <Card className="glass overflow-hidden rounded-2xl border-0">
        <div className="h-1 bg-primary" />
        <CardHeader>
          <CardTitle>Next patient</CardTitle>
          {!nextUp && (
            <CardDescription>
              No confirmed consultations coming up. Patients book against your
              availability — keep it current in{" "}
              <Link href="/doctor/settings" className="underline">
                Profile &amp; availability
              </Link>
              .
            </CardDescription>
          )}
        </CardHeader>
        {nextUp && (
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-medium uppercase text-accent-foreground">
                {(nextUp.patient.name || nextUp.patient.email).slice(0, 2)}
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {nextUp.patient.name || nextUp.patient.email}
                  <PresenceBadge appointmentId={nextUp.appointment.id} />
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatInTimeZone(
                    nextUp.appointment.startsAt,
                    timezone,
                    "EEE, MMM d 'at' h:mm a"
                  )}
                </p>
                {nextUp.appointment.intakeNote && (
                  <p className="mt-0.5 line-clamp-1 max-w-md text-sm text-muted-foreground">
                    {nextUp.appointment.intakeNote.split("\n")[0]}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CountdownRing startsAt={nextUp.appointment.startsAt.toISOString()} />
              <div className="flex flex-wrap items-center gap-2">
                <JoinCallButton
                  appointmentId={nextUp.appointment.id}
                  status={nextUp.appointment.status}
                  startsAt={nextUp.appointment.startsAt.toISOString()}
                  endsAt={nextUp.appointment.endsAt.toISOString()}
                />
                <Button asChild variant="outline">
                  <Link href={`/doctor/encounter/${nextUp.appointment.id}`}>
                    <Stethoscope className="mr-2 h-4 w-4" />
                    Open encounter
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      </ShineBorder>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Today&apos;s schedule</CardTitle>
            {todayRows.length === 0 && (
              <CardDescription className="mt-1.5">
                Nothing scheduled today.
              </CardDescription>
            )}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctor/appointments">
              All appointments
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        {todayRows.length > 0 && (
          <CardContent className="space-y-2">
            {todayRows.map(({ appointment, patient }) => (
              <Link
                key={appointment.id}
                href={`/doctor/encounter/${appointment.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-16 shrink-0 text-sm font-medium tabular-nums">
                    {formatInTimeZone(appointment.startsAt, timezone, "h:mm a")}
                  </span>
                  <span className="truncate">{patient.name || patient.email}</span>
                </div>
                <Badge
                  variant={appointment.status === "completed" ? "secondary" : "default"}
                >
                  {appointment.status === "completed" ? "Completed" : "Confirmed"}
                </Badge>
              </Link>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
