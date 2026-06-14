"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface OutcomeButtonsProps {
  appointmentId: string;
  /** Whether any SOAP section has content yet. */
  hasNote: boolean;
  /** True when a prescription exists but hasn't been issued. */
  prescriptionDraft: boolean;
}

export function OutcomeButtons({
  appointmentId,
  hasNote,
  prescriptionDraft,
}: OutcomeButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"completed" | "no_show" | null>(null);

  const setOutcome = async (status: "completed" | "no_show") => {
    setPending(status);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast.error(typeof body.error === "string" ? body.error : "Couldn't update.");
        return;
      }
      toast.success(status === "completed" ? "Marked as completed" : "Marked as no-show");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(null);
    }
  };

  const completionWarnings = [
    !hasNote ? "The consultation note is empty." : null,
    prescriptionDraft ? "The prescription is still a draft and won't be visible to the patient." : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Mark completed — confirms, and warns about unfinished documentation. */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={pending !== null}>
            {pending === "completed" ? "Saving…" : "Mark completed"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark consultation completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This records the consultation as done. You can still view it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {completionWarnings.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="flex items-center gap-1.5 font-medium">
                <TriangleAlert className="h-4 w-4" /> Before you finish
              </p>
              <ul className="ml-5 list-disc">
                {completionWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOutcome("completed")}>
              Mark completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No-show — visually separated and destructive-confirmed. */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={pending !== null} className="ml-auto">
            {pending === "no_show" ? "Saving…" : "Mark no-show"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as no-show?</AlertDialogTitle>
            <AlertDialogDescription>
              This records that the patient didn&apos;t attend. The consultation is
              closed and this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOutcome("no_show")}>
              Mark no-show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
