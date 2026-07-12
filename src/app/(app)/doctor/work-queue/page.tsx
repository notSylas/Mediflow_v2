import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePenLine,
  HandHeart,
  MessageCircle,
  Pill,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import {
  declineRefillRequestAction,
  dismissCareFollowUpAction,
  dismissFollowUpAction,
  fulfillCareFollowUpAction,
  markMessageReadAction,
  snoozeFollowUpAction,
} from "@/app/(app)/doctor/actions";
import { listDoctorAppointments } from "@/lib/booking/appointments";
import { listDoctorConversations } from "@/lib/messaging/chat";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { listDoctorPendingFollowUps } from "@/lib/follow-ups";
import { listPendingRefillRequests } from "@/lib/refills";
import { listPendingCareFollowUps } from "@/lib/care-subscription";
import { cn } from "@/lib/core/utils";
import { TONES, type ToneName } from "@/lib/core/tones";
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
    <Card className="border-dashed">
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
    <Card className="overflow-hidden">
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
  const [appointments, conversations, followUps, refillRequests, careFollowUps] =
    await Promise.all([
      listDoctorAppointments(profile.id),
      listDoctorConversations(session.user.id),
      listDoctorPendingFollowUps(profile.id),
      listPendingRefillRequests(profile.id),
      listPendingCareFollowUps(profile.id),
    ]);

  const timezone = profile.timezone;

  // Urgency = waited longest / soonest at-risk, not most-recently-created.
  // followUps already arrive sorted ascending by dueAt from the lib query.
  const needsPrescription = appointments
    .filter((row) => row.appointment.status === "completed" && row.prescriptionStatus !== "issued")
    .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime());

  const triageFlagged = appointments
    .filter(
      (row) =>
        Boolean(row.appointment.triageFlaggedAt) &&
        ["confirmed", "completed"].includes(row.appointment.status)
    )
    .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime());

  const unreadConversations = conversations
    .filter((row) => row.conversation.doctorUnread > 0)
    .sort(
      (a, b) =>
        (a.conversation.lastMessageAt?.getTime() ?? 0) -
        (b.conversation.lastMessageAt?.getTime() ?? 0)
    );

  const sortedRefillRequests = [...refillRequests].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const sortedCareFollowUps = [...careFollowUps].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const openCount =
    needsPrescription.length +
    unreadConversations.length +
    refillRequests.length +
    followUps.length +
    triageFlagged.length +
    sortedCareFollowUps.length;

  // Categories are sorted by count descending — whatever actually needs
  // attention surfaces first, instead of scanning past empty categories.
  const categories: Array<{
    key: string;
    tone: ToneName;
    icon: LucideIcon;
    title: string;
    statLabel: string;
    count: number;
    description: string;
    render: () => React.ReactNode;
  }> = [
    {
      key: "rx",
      tone: "amber",
      icon: FilePenLine,
      title: "Visits needing prescription",
      statLabel: "Needs Rx",
      count: needsPrescription.length,
      description: "Completed visits where the Rx was skipped or left in draft.",
      render: () => (
        <>
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
        </>
      ),
    },
    {
      key: "messages",
      tone: "blue",
      icon: MessageCircle,
      title: "Unread patient messages",
      statLabel: "Unread",
      count: unreadConversations.length,
      description: "Open the inbox and reply before messages go stale.",
      render: () => (
        <>
          {unreadConversations.slice(0, 8).map(({ conversation, patient }) => (
            <div
              key={conversation.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"
            >
              <Link
                href="/messages"
                className="flex min-w-0 flex-1 items-center justify-between gap-3"
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
              <form action={markMessageReadAction}>
                <input type="hidden" name="conversationId" value={conversation.id} />
                <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  Mark read
                </Button>
              </form>
            </div>
          ))}
        </>
      ),
    },
    {
      key: "refills",
      tone: "violet",
      icon: Pill,
      title: "Refill requests",
      statLabel: "Refills",
      count: sortedRefillRequests.length,
      description: "Patients asking for continuation of a previous prescription.",
      render: () => (
        <>
          {sortedRefillRequests.slice(0, 8).map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"
            >
              <Link
                href="/doctor/refill-requests"
                className="flex min-w-0 flex-1 items-center justify-between gap-3"
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
              <form action={declineRefillRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  Decline
                </Button>
              </form>
            </div>
          ))}
        </>
      ),
    },
    {
      key: "care-followups",
      tone: "blue",
      icon: HandHeart,
      title: "Care plan follow-ups",
      statLabel: "Care",
      count: sortedCareFollowUps.length,
      description: "Monthly check-in requests from MediFlow Care members.",
      render: () => (
        <>
          {sortedCareFollowUps.slice(0, 8).map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"
            >
              <Link
                href={`/doctor/patients/${request.patientId}`}
                className="min-w-0 flex-1"
              >
                <span className="block truncate font-medium">
                  {request.patientName || request.patientEmail}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  Care member · {formatInTimeZone(request.createdAt, timezone, "MMM d")}
                  {request.note ? ` · ${request.note}` : ""}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <form action={fulfillCareFollowUpAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" size="sm" className="h-7 px-2 text-xs">
                    Start consult
                  </Button>
                </form>
                <form action={dismissCareFollowUpAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Dismiss
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
      key: "followups",
      tone: "emerald",
      icon: RotateCcw,
      title: "Follow-ups not booked",
      statLabel: "Follow-ups",
      count: followUps.length,
      description: "Doctor-recommended check-ins still waiting for patient action.",
      render: () => (
        <>
          {followUps.slice(0, 8).map((followUp) => (
            <div
              key={followUp.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"
            >
              <Link
                href={`/doctor/patients/${followUp.patientId}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {followUp.patientName || followUp.patientEmail}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Due {formatInTimeZone(followUp.dueAt, timezone, "MMM d")}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <form action={snoozeFollowUpAction}>
                  <input type="hidden" name="followUpId" value={followUp.id} />
                  <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Snooze 7d
                  </Button>
                </form>
                <form action={dismissFollowUpAction}>
                  <input type="hidden" name="followUpId" value={followUp.id} />
                  <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Dismiss
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
      key: "triage",
      tone: "rose",
      icon: AlertTriangle,
      title: "Triage-flagged visits",
      statLabel: "Triage",
      count: triageFlagged.length,
      description: "Bookings where intake matched a red-flag safety rule.",
      render: () => (
        <>
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
        </>
      ),
    },
  ];
  // No quick-dismiss for "needs Rx" or "triage" — both require actually
  // opening the encounter to resolve safely (a prescription must be written;
  // a safety flag shouldn't be clearable without reviewing the intake).

  const sortedCategories = [...categories].sort((a, b) => b.count - a.count);

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {sortedCategories.map((cat) => (
          <div key={cat.key} className={cn("rounded-xl p-4", TONES[cat.tone].tile)}>
            <p className="text-2xl font-semibold tabular-nums">{cat.count}</p>
            <p className="text-sm text-muted-foreground">{cat.statLabel}</p>
          </div>
        ))}
      </div>

      {openCount === 0 && <EmptyState />}

      <div className="grid gap-6 lg:grid-cols-2">
        {sortedCategories.map((cat) => (
          <QueueCard
            key={cat.key}
            tone={cat.tone}
            icon={cat.icon}
            title={cat.title}
            count={cat.count}
            description={cat.description}
          >
            {cat.render()}
          </QueueCard>
        ))}
      </div>
    </div>
  );
}
