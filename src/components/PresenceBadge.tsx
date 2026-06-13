"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 20_000;

/**
 * Live "other party is in the room" indicator. Polls the presence endpoint
 * while mounted; renders nothing until the other participant connects.
 */
export function PresenceBadge({
  appointmentId,
  label = "Patient is in the waiting room",
}: {
  appointmentId: string;
  label?: string;
}) {
  const [present, setPresent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/presence`);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setPresent(Boolean(body.otherPartyPresent));
      } catch {
        // Presence is best-effort; stay quiet on failure.
      }
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [appointmentId]);

  if (!present) return null;

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
      </span>
      {label}
    </span>
  );
}
