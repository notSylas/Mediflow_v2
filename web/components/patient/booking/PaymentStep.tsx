"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";

interface PaymentStepProps {
  startsAt: string;
  timezone: string;
  amountInPaise: number;
  onConfirm: () => Promise<void>;
  error: string | null;
}

export function PaymentStep({
  startsAt,
  timezone,
  amountInPaise,
  onConfirm,
  error,
}: PaymentStepProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-background/70 shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-muted-foreground">Appointment</span>
          <span className="text-right font-medium">
            {formatInTimeZone(new Date(startsAt), timezone, "EEEE, MMM d 'at' h:mm a")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Consultation fee</span>
          <span className="text-lg font-semibold">
            ₹{(amountInPaise / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <p className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-muted-foreground">
        Your slot is held for 10 minutes while you pay. Payment is processed
        securely by Razorpay.
      </p>

      {error && (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="button" onClick={handleConfirm} disabled={confirming} size="lg">
        {confirming ? "Processing…" : "Pay & confirm booking"}
      </Button>
    </div>
  );
}
