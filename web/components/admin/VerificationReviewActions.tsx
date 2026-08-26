"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VerificationReviewActions({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "reject") => {
    setError(null);
    setIsSubmitting(decision);
    try {
      const res = await fetch(`/api/admin/doctor-verification/${doctorId}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(typeof json?.error === "string" ? json.error : "Couldn't record this decision.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. NMC IMR: matched reg #X, council Y"
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" onClick={() => decide("approve")} disabled={isSubmitting !== null}>
          {isSubmitting === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => decide("reject")}
          disabled={isSubmitting !== null}
        >
          {isSubmitting === "reject" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
