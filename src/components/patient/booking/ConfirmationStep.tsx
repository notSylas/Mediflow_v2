import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/wow/MagneticButton";

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
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[var(--success)]/30 bg-[var(--success)]/8 p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--success)]/15 text-[var(--success)]">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <div>
          <p className="text-2xl font-semibold tracking-tight">Your consultation is confirmed</p>
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
        <MagneticButton className="flex-1">
          <Button asChild size="lg" className="w-full">
            <Link href="/patient/appointments">View my appointments</Link>
          </Button>
        </MagneticButton>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/patient/book">Book another</Link>
        </Button>
      </div>
    </div>
  );
}
