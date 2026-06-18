import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePenLine,
  MessageCircle,
  Pill,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { listDoctorAppointments } from "@/lib/appointments";
import { listDoctorConversations } from "@/lib/chat";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { listDoctorPendingFollowUps } from "@/lib/follow-ups";
import { listPendingRefillRequests } from "@/lib/refills";
import { cn } from "@/lib/utils";
import { TONES, type ToneName } from "@/lib/tones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function EmptyState() {
  return (
    <Card className="glass border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <p className="font-medium">No open work right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prescriptions, refills, unread messages, follow-ups, and triage flags
            will show here when they need action.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  tone,
  icon: Icon,
  title,
  count,
  description,
  children,
}: {
  tone: ToneName;
  icon: LucideIcon;
  title: string;
  count: number;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              TONES[tone].chip
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
      </CardHeader>
      {count > 0 && <CardContent className="space-y-3">{children}</CardContent>}
    </Card>
  );
}

export default async function DoctorWorkQueuePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const [appointments, conversations, followUps, refillRequests] = await Promise.all([
    listDoctorAppointments(profile.id),
    listDoctorConversations(session.user.id),
    listDoctorPendingFollowUps(profile.id),
    listPendingRefillRequests(profile.id),
  ]);

  const needsPrescription = appointments.filter(
    (row) =>
      row.appointment.status === "completed" && row.prescriptionStatus !== "issued"
  );
  const triageFlagged = appointments.filter(
    (row) =>
      Boolean(row.appointment.triageFlaggedAt) &&
      ["confirmed", "completed"].includes(row.appointment.status)
  );
  const unreadConversations = conversations.filter(
    (row) => row.conversation.doctorUnread > 0
  );
  const openCount =
    needsPrescription.length +
    unreadConversations.length +
    refillRequests.length +
    followUps.length +
    triageFlagged.length;

  const timezone = profile.timezone;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-6xl space-y-8 px-4 py-10 duration-500 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Doctor work queue</h1>
          <p className="mt-1 text-muted-foreground">
            One place for clinical and operational tasks that should not be missed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/doctor/appointments">
            All appointments
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Needs Rx", value: needsPrescription.length, tone: "amber" as const },
          { label: "Unread", value: unreadConversations.length, tone: "blue" as const },
          { label: "Refills", value: refillRequests.length, tone: "violet" as const },
          { label: "Follow-ups", value: followUps.length, tone: "emerald" as const },
          { label: "Triage", value: triageFlagged.length, tone: "rose" as const },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn("rounded-xl p-4", TONES[stat.tone].tile)}
          >
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {openCount === 0 && <EmptyState />}

      <div className="grid gap-6 lg:grid-cols-2">
        <QueueCard
          tone="amber"
          icon={FilePenLine}
          title="Visits needing prescription"
          count={needsPrescription.length}
          description="Completed visits where the Rx was skipped or left in draft."
        >
          {needsPrescription.slice(0, 8).map(({ appointment, patient }) => (
            <Link
              key={appointment.id}
              href={`/doctor/encounter/${appointment.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {patient.name || patient.email}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {formatInTimeZone(appointment.startsAt, timezone, "MMM d, h:mm a")}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </QueueCard>

        <QueueCard
          tone="blue"
          icon={MessageCircle}
          title="Unread patient messages"
          count={unreadConversations.length}
          description="Open the inbox and reply before messages go stale."
        >
          {unreadConversations.slice(0, 8).map(({ conversation, patient }) => (
            <Link
              key={conversation.id}
              href="/messages"
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {patient.name || patient.email}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {conversation.lastMessagePreview ?? "New conversation"}
                </span>
              </span>
              <Badge>{conversation.doctorUnread}</Badge>
            </Link>
          ))}
        </QueueCard>

        <QueueCard
          tone="violet"
          icon={Pill}
          title="Refill requests"
          count={refillRequests.length}
          description="Patients asking for continuation of a previous prescription."
        >
          {refillRequests.slice(0, 8).map((request) => (
            <Link
              key={request.id}
              href="/doctor/refill-requests"
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {request.patientName || request.patientEmail}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {request.diagnosis ?? "Previous prescription"} ·{" "}
                  {formatInTimeZone(request.createdAt, timezone, "MMM d")}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </QueueCard>

        <QueueCard
          tone="emerald"
          icon={RotateCcw}
          title="Follow-ups not booked"
          count={followUps.length}
          description="Doctor-recommended check-ins still waiting for patient action."
        >
          {followUps.slice(0, 8).map((followUp) => (
            <Link
              key={followUp.id}
              href={`/doctor/patients/${followUp.patientId}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {followUp.patientName || followUp.patientEmail}
                </span>
                <span className="block text-sm text-muted-foreground">
                  Due {formatInTimeZone(followUp.dueAt, timezone, "MMM d")}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </QueueCard>

        <QueueCard
          tone="rose"
          icon={AlertTriangle}
          title="Triage-flagged visits"
          count={triageFlagged.length}
          description="Bookings where intake matched a red-flag safety rule."
        >
          {triageFlagged.slice(0, 8).map(({ appointment, patient }) => (
            <Link
              key={appointment.id}
              href={`/doctor/encounter/${appointment.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-destructive/50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {patient.name || patient.email}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {appointment.intakeNote ?? "Review intake before consult"}
                </span>
              </span>
              <Badge variant="destructive">Review</Badge>
            </Link>
          ))}
        </QueueCard>
      </div>
    </div>
  );
}
