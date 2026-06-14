"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
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
import { statusLabel, statusVariant } from "@/lib/appointment-status";

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
    <Card className="glass hover-lift">
      <CardContent className="space-y-2 pt-6">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/patient/appointments/${id}`} className="font-medium hover:underline">
            {formatInTimeZone(new Date(startsAt), timezone, "EEEE, MMM d 'at' h:mm a")}
          </Link>
          <Badge variant={statusVariant(status)}>
            {statusLabel(status, "patient")}
          </Badge>
        </div>

        {status === "confirmed" && (
          <JoinCallButton
            appointmentId={id}
            status={status}
            startsAt={startsAt}
            endsAt={endsAt}
          />
        )}

        {amountInPaise !== null && (
          <p className="text-sm text-muted-foreground">₹{(amountInPaise / 100).toFixed(2)}</p>
        )}

        {intakeNote && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{intakeNote}</p>
        )}

        {reportId && (
          <a
            href={`/api/reports/${reportId}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            {reportFilename ?? "Attached report"}
          </a>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={cancelling}>
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
                <AlertDialogAction onClick={handleCancel}>Cancel appointment</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
