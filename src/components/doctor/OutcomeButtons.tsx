"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface OutcomeButtonsProps {
  appointmentId: string;
}

export function OutcomeButtons({ appointmentId }: OutcomeButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"completed" | "no_show" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setOutcome = async (status: "completed" | "no_show") => {
    setPending(status);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json();
        const message =
          typeof body.error === "string" ? body.error : "Couldn't update.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(
        status === "completed" ? "Marked as completed" : "Marked as no-show"
      );
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => setOutcome("completed")} disabled={pending !== null}>
        {pending === "completed" ? "Saving…" : "Mark completed"}
      </Button>
      <Button
        variant="outline"
        onClick={() => setOutcome("no_show")}
        disabled={pending !== null}
      >
        {pending === "no_show" ? "Saving…" : "Mark no-show"}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
