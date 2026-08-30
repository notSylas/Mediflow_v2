"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Blocks the authenticated app shell until the signed-in user has accepted
 * the current Terms + Privacy Policy — rendered from web/app/(app)/layout.tsx
 * in place of `children` when `hasAcceptedCurrentTerms` is false (new
 * accounts, or existing ones after a version bump).
 */
export function AcceptTermsGate() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!checked) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "web" }),
      });
      if (!res.ok) {
        toast.error("Couldn't save your acceptance. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Before you continue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We've updated our policies. Please review and accept them to keep using
          MediFlow.
        </p>

        <label className="mt-6 flex items-start gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            I have read and agree to the{" "}
            <Link href="/terms" target="_blank" className="text-foreground underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="text-foreground underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <Button
          size="lg"
          className="mt-6 h-11 w-full"
          disabled={!checked || submitting}
          onClick={handleContinue}
        >
          {submitting ? "Saving…" : "Agree & continue"}
        </Button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your data is used only to provide your care.
        </p>
      </div>
    </div>
  );
}
