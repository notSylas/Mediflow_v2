"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getJoinDenial,
  JOIN_EARLY_MINUTES,
  type JoinDenial,
} from "@/lib/video/call-window";

interface JoinCallButtonProps {
  appointmentId: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

const DENIAL_HINTS: Record<Exclude<JoinDenial, null>, string | null> = {
  not_confirmed: null,
  too_early: `You can join ${JOIN_EARLY_MINUTES} minutes before the appointment.`,
  too_late: null,
};

export function JoinCallButton({
  appointmentId,
  status,
  startsAt,
  endsAt,
}: JoinCallButtonProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const denial = getJoinDenial(
    { status, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
    now
  );

  if (denial === null) {
    return (
      <Button asChild>
        <Link href={`/call/${appointmentId}`}>
          <Video className="mr-2 h-4 w-4" />
          Join video consultation
        </Link>
      </Button>
    );
  }

  const hint = DENIAL_HINTS[denial];
  if (!hint) return null;

  return (
    <div className="space-y-2">
      <Button disabled>
        <Video className="mr-2 h-4 w-4" />
        Join video consultation
      </Button>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
