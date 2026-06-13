import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmationStepProps {
  startsAt: string;
  timezone: string;
  amountInPaise: number;
}

export function ConfirmationStep({
  startsAt,
  timezone,
  amountInPaise,
}: ConfirmationStepProps) {
  return (
    <div className="animate-in fade-in zoom-in-95 space-y-6 duration-500">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <div>
          <p className="text-lg font-semibold">Your consultation is confirmed.</p>
          <p className="mt-1 text-muted-foreground">
            {formatInTimeZone(new Date(startsAt), timezone, "EEEE, MMM d 'at' h:mm a")}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ₹{(amountInPaise / 100).toFixed(2)} paid · A reminder will reach you before
            the call.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/patient/appointments">View my appointments</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/patient/book">Book another</Link>
        </Button>
      </div>
    </div>
  );
}
