"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function RescheduleDialog({
  appointmentId,
  timezone,
}: {
  appointmentId: string;
  timezone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || slots) return;
    fetch("/api/slots")
      .then((r) => r.json())
      .then((data: { slots: string[] }) => {
        setSlots(data.slots);
        if (data.slots[0]) {
          setActiveDate(formatInTimeZone(new Date(data.slots[0]), timezone, "yyyy-MM-dd"));
        }
      })
      .catch(() => setSlots([]));
  }, [open, slots, timezone]);

  const pick = async (startsAt: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Couldn't reschedule.");
        if (res.status === 409) {
          setSlots(null); // refresh slots
        }
        return;
      }
      toast.success("Appointment rescheduled");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const byDate = new Map<string, string[]>();
  for (const s of slots ?? []) {
    const key = formatInTimeZone(new Date(s), timezone, "yyyy-MM-dd");
    byDate.set(key, [...(byDate.get(key) ?? []), s]);
  }
  const dates = Array.from(byDate.keys());
  const current = activeDate ?? dates[0];
  const times = current ? (byDate.get(current) ?? []) : [];

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="mr-2 h-4 w-4" />
          Reschedule
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Pick a new time</AlertDialogTitle>
          <AlertDialogDescription>
            Your payment carries over — choose any available slot.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {slots === null && <p className="text-sm text-muted-foreground">Loading times…</p>}
        {slots?.length === 0 && (
          <p className="text-sm text-muted-foreground">No open slots right now.</p>
        )}

        {dates.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {dates.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={d === current ? "default" : "outline"}
                  onClick={() => setActiveDate(d)}
                >
                  {formatInTimeZone(new Date(`${d}T00:00:00Z`), "UTC", "EEE, MMM d")}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {times.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => pick(s)}
                >
                  {formatInTimeZone(new Date(s), timezone, "h:mm a")}
                </Button>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Keep current time</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
