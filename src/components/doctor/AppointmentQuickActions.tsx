"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { canCancelAppointment } from "@/lib/booking";

interface AppointmentQuickActionsProps {
  appointmentId: string;
  status: string;
  startsAt: string;
}

/**
 * Routine status changes (no-show, cancel) directly from the appointments
 * list — opening the full encounter workspace is overkill for "this patient
 * didn't show up." Reuses the same /api/appointments/[id]/status and
 * /cancel endpoints OutcomeButtons and RescheduleDialog already call.
 */
export function AppointmentQuickActions({
  appointmentId,
  status,
  startsAt,
}: AppointmentQuickActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"no_show" | "cancel" | null>(null);

  if (status !== "confirmed") return null;

  const canCancel = canCancelAppointment({ status, startsAt: new Date(startsAt) }, new Date());

  const markNoShow = async () => {
    setPending("no_show");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no_show" }),
      });
      if (!res.ok) {
        toast.error("Couldn't mark as no-show.");
        return;
      }
      toast.success("Marked as no-show");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(null);
    }
  };

  const cancel = async () => {
    setPending("cancel");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Couldn't cancel this appointment.");
        return;
      }
      toast.success("Appointment cancelled");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={pending !== null}
        onClick={markNoShow}
      >
        No-show
      </Button>
      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              disabled={pending !== null}
            >
              Cancel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                This can&apos;t be undone. The slot will be released.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={cancel}>Cancel appointment</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
