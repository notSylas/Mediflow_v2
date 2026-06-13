"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";

interface SlotStepProps {
  timezone: string;
  onPick: (startsAt: string) => Promise<void>;
  onBack: () => void;
  error: string | null;
}

export function SlotStep({ timezone, onPick, onBack, error }: SlotStepProps) {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/slots")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load slots");
        return res.json();
      })
      .then((data: { slots: string[] }) => {
        if (cancelled) return;
        setSlots(data.slots);
        if (data.slots.length > 0) {
          setSelectedDate(formatInTimeZone(new Date(data.slots[0]), timezone, "yyyy-MM-dd"));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load available times. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [timezone]);

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (!slots) {
    return <p className="text-sm text-muted-foreground">Loading available times…</p>;
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No upcoming slots are available right now. Please check back later.
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  const byDate = new Map<string, string[]>();
  for (const slot of slots) {
    const key = formatInTimeZone(new Date(slot), timezone, "yyyy-MM-dd");
    const existing = byDate.get(key) ?? [];
    existing.push(slot);
    byDate.set(key, existing);
  }

  const dates = Array.from(byDate.keys());
  const activeDate = selectedDate ?? dates[0];
  const timesForDate = byDate.get(activeDate) ?? [];

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <p className="text-sm font-medium">Choose a date</p>
        <div className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <Button
              key={date}
              type="button"
              size="sm"
              variant={date === activeDate ? "default" : "outline"}
              onClick={() => setSelectedDate(date)}
            >
              {formatInTimeZone(new Date(`${date}T00:00:00Z`), "UTC", "EEE, MMM d")}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Choose a time</p>
        <div className="flex flex-wrap gap-2">
          {timesForDate.map((slot) => (
            <Button
              key={slot}
              type="button"
              size="sm"
              variant="outline"
              disabled={picking !== null}
              onClick={async () => {
                setPicking(slot);
                await onPick(slot);
                setPicking(null);
              }}
            >
              {picking === slot
                ? "Booking…"
                : formatInTimeZone(new Date(slot), timezone, "h:mm a")}
            </Button>
          ))}
        </div>
      </div>

      <Button type="button" variant="outline" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
