"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 60_000;

interface NextConsult {
  id: string;
  startsAt: string;
  endsAt: string;
  patientName: string | null;
  patientEmail: string;
}

/**
 * App-wide reminder strip for the doctor: appears when a confirmed consult
 * starts within 15 minutes (or is running), with one-click join.
 */
export function NextConsultBanner() {
  const [consult, setConsult] = useState<NextConsult | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/doctor/next-consult");
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setConsult(body);
      } catch {
        // Best-effort; the dashboard still shows the schedule.
      }
    };

    void check();
    const poll = setInterval(check, POLL_INTERVAL_MS);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  if (!consult) return null;

  const minutesUntil = Math.round((new Date(consult.startsAt).getTime() - now) / 60_000);
  const name = consult.patientName || consult.patientEmail;
  const timing =
    minutesUntil > 1
      ? `starts in ${minutesUntil} minutes`
      : minutesUntil >= 0
        ? "starting now"
        : "in progress";

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-primary/20 bg-accent/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="text-sm text-accent-foreground">
          <span className="font-semibold">Next consult:</span> {name} — {timing}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/call/${consult.id}`}>
              <Video className="mr-1.5 h-3.5 w-3.5" />
              Join
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/doctor/encounter/${consult.id}`}>
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
              Encounter
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
