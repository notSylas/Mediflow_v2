import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FilePenLine,
  HandHeart,
  IndianRupee,
  ListChecks,
  MessageCircle,
  Pill,
  RotateCcw,
  Settings,
  Stethoscope,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { cn } from "@/lib/core/utils";
import { TONES } from "@/lib/core/tones";
import { db } from "@/db";
import { availabilityRules } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { listDoctorAppointments } from "@/lib/booking/appointments";
import { listDoctorConversations } from "@/lib/messaging/chat";
import { getDoctorRevenueInPaise, getOrCreateDoctorProfile } from "@/lib/people/doctor";
import { listDoctorPendingFollowUps } from "@/lib/care/follow-ups";
import { listPendingRefillRequests } from "@/lib/care/refills";
import {
  countActiveSubscribers,
  listPendingCareFollowUps,
} from "@/lib/care/care-subscription";
import { JoinCallButton } from "@/components/common/JoinCallButton";
import { PresenceBadge } from "@/components/common/PresenceBadge";
import { SpotlightCard } from "@/components/wow/SpotlightCard";
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
  const [
    rows,
    revenueInPaise,
    rules,
    conversations,
    followUps,
    refillRequests,
    activeCareMembers,
    careFollowUps,
  ] = await Promise.all([
    listDoctorAppointments(profile.id),
    getDoctorRevenueInPaise(profile.id),
    db
      .select({ id: availabilityRules.id })
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .limit(1),
    listDoctorConversations(session.user.id),
    listDoctorPendingFollowUps(profile.id),
    listPendingRefillRequests(profile.id),
    countActiveSubscribers(profile.id),
    listPendingCareFollowUps(profile.id),
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

  const needsPrescription = rows.filter(
    ({ appointment, prescriptionStatus }) =>
      appointment.status === "completed" && prescriptionStatus !== "issued"
  );
  const unreadConversations = conversations.filter(
    ({ conversation }) => conversation.doctorUnread > 0
  );
  const triageFlagged = rows.filter(
    ({ appointment }) =>
      Boolean(appointment.triageFlaggedAt) &&
      ["confirmed", "completed"].includes(appointment.status)
  );
  const queueCount =
    needsPrescription.length +
    unreadConversations.length +
    refillRequests.length +
    careFollowUps.length +
    followUps.length +
    triageFlagged.length;

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
    {
      icon: HandHeart,
      label: "Care members",
      value: String(activeCareMembers),
      tone: "emerald" as const,
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
        <Card className="border-primary/30">
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Needs your attention
            </CardTitle>
            <CardDescription>
              Clinical and operational tasks collected in one queue.
            </CardDescription>
          </div>
          <Button asChild variant={queueCount > 0 ? "default" : "outline"} size="sm">
            <Link href="/doctor/work-queue">
              Open queue
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            {
              label: "Needs Rx",
              value: needsPrescription.length,
              icon: FilePenLine,
              tone: "amber" as const,
            },
            {
              label: "Unread",
              value: unreadConversations.length,
              icon: MessageCircle,
              tone: "blue" as const,
            },
            {
              label: "Refills",
              value: refillRequests.length,
              icon: Pill,
              tone: "violet" as const,
            },
            {
              label: "Follow-ups",
              value: followUps.length,
              icon: RotateCcw,
              tone: "emerald" as const,
            },
            {
              label: "Care follow-ups",
              value: careFollowUps.length,
              icon: HandHeart,
              tone: "emerald" as const,
            },
            {
              label: "Triage",
              value: triageFlagged.length,
              icon: AlertTriangle,
              tone: "rose" as const,
            },
          ].map((item) => (
            <Link
              key={item.label}
              href="/doctor/work-queue"
              className={cn(
                "rounded-xl p-3 transition-transform hover:-translate-y-0.5",
                TONES[item.tone].tile
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  TONES[item.tone].chip
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      {nextUp ? (
        <div>
          {/* Glass hero — "Next patient" is the doctor's equivalent hero
              moment to the patient's booking confirmation (docs/Design.md
              explicitly allows this surface). Avatar/badge get a translucent
              white treatment since --accent would be low-contrast against
              the gradient; actions live outside it for the same reason. */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="glass-hero anim-fade-up flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-base font-medium uppercase text-primary-foreground">
                {(nextUp.patient.name || nextUp.patient.email).slice(0, 2)}
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {nextUp.patient.name || nextUp.patient.email}
                  <PresenceBadge appointmentId={nextUp.appointment.id} />
                </p>
                <p className="text-sm text-primary-foreground/85">
                  {formatInTimeZone(
                    nextUp.appointment.startsAt,
                    timezone,
                    "EEE, MMM d 'at' h:mm a"
                  )}
                </p>
                {nextUp.appointment.intakeNote && (
                  <p className="mt-0.5 line-clamp-1 max-w-md text-sm text-primary-foreground/85">
                    {nextUp.appointment.intakeNote.split("\n")[0]}
                  </p>
                )}
              </div>
            </div>
            <div className="glass-frost flex items-center justify-center p-4">
              <CountdownRing startsAt={nextUp.appointment.startsAt.toISOString()} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Next patient</CardTitle>
            <CardDescription>
              No confirmed consultations coming up. Patients book against your
              availability — keep it current in{" "}
              <Link href="/doctor/settings" className="underline">
                Profile &amp; availability
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="glass-frost">
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
