"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { VisitReason } from "@/lib/booking";
import { BookingStepper } from "./BookingStepper";
import { ConfirmationStep } from "./ConfirmationStep";
import { IntakeStep, type ReportRef } from "./IntakeStep";
import { PaymentStep } from "./PaymentStep";
import { SlotStep } from "./SlotStep";

const STEP_INDEX: Record<Step, number> = {
  loading: 0,
  intake: 0,
  slot: 1,
  payment: 2,
  confirmation: 3,
};

interface AppointmentData {
  id: string;
  startsAt: string;
  status: string;
  holdExpiresAt: string | null;
}

interface PaymentData {
  amountInPaise: number;
  status: string;
}

type Step = "loading" | "intake" | "slot" | "payment" | "confirmation";

export function BookingFlow({
  feeInPaise,
  timezone,
}: {
  feeInPaise: number;
  timezone: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointment");

  const [step, setStep] = useState<Step>(appointmentId ? "loading" : "intake");
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [visitReason, setVisitReason] = useState<VisitReason>("general-consultation");
  const [symptoms, setSymptoms] = useState("");
  const [report, setReport] = useState<ReportRef | null>(null);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;

    let cancelled = false;

    fetch(`/api/appointments/${appointmentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: { appointment: AppointmentData; payment: PaymentData | null }) => {
        if (cancelled) return;
        setAppointment(data.appointment);
        setPayment(data.payment);

        if (data.appointment.status === "confirmed") {
          setStep("confirmation");
        } else if (
          data.appointment.status === "pending_payment" &&
          data.appointment.holdExpiresAt &&
          new Date(data.appointment.holdExpiresAt) > new Date()
        ) {
          setStep("payment");
        } else {
          setError("Your slot hold expired. Please pick a new time.");
          router.replace("/patient/book");
          setStep("intake");
        }
      })
      .catch(() => {
        if (cancelled) return;
        router.replace("/patient/book");
        setStep("intake");
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, router]);

  const handleSlotPick = useCallback(
    async (startsAt: string) => {
      setError(null);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt,
          visitReason,
          symptoms,
          reportId: report?.id,
          consent: consented,
          consentSource: "web",
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Couldn't book that slot. Please try another.");
        return;
      }

      setAppointment(body as AppointmentData);
      setPayment({ amountInPaise: feeInPaise, status: "created" });
      router.replace(`/patient/book?appointment=${body.id}`);
      setStep("payment");
    },
    [visitReason, symptoms, report, consented, feeInPaise, router]
  );

  const handleConfirmPayment = useCallback(async () => {
    if (!appointment) return;
    setError(null);

    const response = await fetch(`/api/appointments/${appointment.id}/payment`, {
      method: "POST",
    });

    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Couldn't confirm your booking.");
      if (response.status === 410) {
        router.replace("/patient/book");
        setStep("intake");
        setAppointment(null);
      }
      return;
    }

    if (body.provider === "mock") {
      setAppointment(body.appointment as AppointmentData);
      setStep("confirmation");
      return;
    }

    // Razorpay: open Checkout, then confirm with the signed callback.
    try {
      const { openRazorpayCheckout } = await import("@/lib/razorpay-checkout");
      const result = await openRazorpayCheckout({
        keyId: body.keyId,
        orderId: body.orderId,
        amountInPaise: body.amountInPaise,
        currency: body.currency,
        name: body.name ?? "",
        email: body.email ?? "",
      });

      const verifyRes = await fetch(
        `/api/appointments/${appointment.id}/payment/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        }
      );
      const verifyBody = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyBody.error ?? "Payment verification failed.");
        return;
      }

      setAppointment(verifyBody.appointment as AppointmentData);
      setStep("confirmation");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "dismissed"
          ? "Payment was cancelled. Your slot is held for a few more minutes — try again."
          : "Payment didn't go through. You haven't been charged beyond this attempt — try again."
      );
    }
  }, [appointment, router]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <BookingStepper currentIndex={STEP_INDEX[step]} />
      <Card className="glass overflow-hidden rounded-3xl">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400" />
        <CardContent className="p-5 sm:p-8">
          {step === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}

          {step === "intake" && (
            <IntakeStep
              visitReason={visitReason}
              onVisitReasonChange={setVisitReason}
              symptoms={symptoms}
              onSymptomsChange={setSymptoms}
              report={report}
              onReportChange={setReport}
              consented={consented}
              onConsentedChange={setConsented}
              onContinue={() => setStep("slot")}
            />
          )}

          {step === "slot" && (
            <SlotStep
              timezone={timezone}
              onPick={handleSlotPick}
              onBack={() => setStep("intake")}
              error={error}
            />
          )}

          {step === "payment" && appointment && (
            <PaymentStep
              startsAt={appointment.startsAt}
              timezone={timezone}
              amountInPaise={payment?.amountInPaise ?? feeInPaise}
              onConfirm={handleConfirmPayment}
              error={error}
            />
          )}

          {step === "confirmation" && appointment && (
            <ConfirmationStep
              startsAt={appointment.startsAt}
              timezone={timezone}
              amountInPaise={payment?.amountInPaise ?? feeInPaise}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
