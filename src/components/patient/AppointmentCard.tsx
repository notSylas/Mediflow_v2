"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowUpRight,
  CalendarClock,
  FileText,
  IndianRupee,
  MessageSquareText,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { JoinCallButton } from "@/components/JoinCallButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { statusLabel, statusVariant } from "@/lib/booking/appointment-status";
import { cn } from "@/lib/core/utils";

export interface AppointmentCardProps {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  intakeNote: string | null;
  amountInPaise: number | null;
  reportId: string | null;
  reportFilename: string | null;
  timezone: string;
  canCancel: boolean;
}

export function AppointmentCard({
  id,
  startsAt,
  endsAt,
  status,
  intakeNote,
  amountInPaise,
  reportId,
  reportFilename,
  timezone,
  canCancel,
}: AppointmentCardProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const dateLabel = formatInTimeZone(start, timezone, "EEE, MMM d");
  const timeLabel = formatInTimeZone(start, timezone, "h:mm a");
  const fullLabel = formatInTimeZone(start, timezone, "EEEE, MMMM d 'at' h:mm a");
  const isConfirmed = status === "confirmed";
  const statusTone =
    status === "confirmed"
      ? "from-teal-500 to-emerald-400"
      : status === "pending_payment"
        ? "from-amber-400 to-orange-400"
        : status === "completed"
          ? "from-blue-500 to-indigo-400"
          : "from-slate-300 to-slate-200";

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${id}/cancel`, { method: "POST" });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't cancel this appointment");
      }

      toast.success("Appointment cancelled", {
        description: "The slot is now free for other patients.",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel this appointment");
      setCancelling(false);
    }
  };

  return (
    <Card className="glass hover-lift overflow-hidden rounded-3xl">
      <div className={cn("h-1.5 bg-gradient-to-r", statusTone)} />
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[112px_minmax(0,1fr)]">
          <div className="rounded-2xl border bg-background/70 p-4 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {formatInTimeZone(start, timezone, "MMM")}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">
              {formatInTimeZone(start, timezone, "d")}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatInTimeZone(start, timezone, "EEE")}
            </p>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/patient/appointments/${id}`}
                  className="group inline-flex items-center gap-2 text-lg font-semibold tracking-tight hover:text-primary"
                >
                  <span className="truncate">{dateLabel} at {timeLabel}</span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4" />
                    {duration} min video consultation
                  </span>
                  <span className="sr-only">{fullLabel}</span>
                </p>
              </div>
              <Badge variant={statusVariant(status)} className="shrink-0">
                {statusLabel(status, "patient")}
              </Badge>
            </div>

            {intakeNote ? (
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Visit reason
                </p>
                <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                  {intakeNote}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                No visit note was added for this appointment.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {amountInPaise !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-sm text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {(amountInPaise / 100).toFixed(0)} paid
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-sm text-muted-foreground">
                <Video className="h-3.5 w-3.5" />
                Video visit
              </span>
              {reportId && (
                <a
                  href={`/api/reports/${reportId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-sm text-primary transition hover:bg-accent"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {reportFilename ?? "Attached report"}
                </a>
              )}
            </div>

            {error && (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {isConfirmed && (
                <JoinCallButton
                  appointmentId={id}
                  status={status}
                  startsAt={startsAt}
                  endsAt={endsAt}
                />
              )}
              <Button asChild variant="outline">
                <Link href={`/patient/appointments/${id}`}>View details</Link>
              </Button>
              {canCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" disabled={cancelling}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will free up the slot for other patients. This can&apos;t be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
                        Cancel appointment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
