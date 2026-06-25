"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface DayBlockToggleProps {
  date: string;
  /** The full-day "blocked" override's id, if one already exists for this date. */
  blockedOverrideId: string | null;
}

/**
 * Inline block/unblock for a single day from the schedule week view, so the
 * doctor doesn't have to leave the page to take a day off. Wraps the existing
 * /api/doctor/availability/overrides CRUD routes (used by OverridesEditor on
 * the settings page) — no new backend, just a tighter-scoped client.
 */
export function DayBlockToggle({ date, blockedOverrideId }: DayBlockToggleProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const block = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/doctor/availability/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, kind: "blocked" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.[0]?.message ?? "Couldn't block this day.");
        return;
      }
      toast.success("Day blocked");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  };

  const unblock = async () => {
    if (!blockedOverrideId) return;
    setPending(true);
    try {
      const res = await fetch(`/api/doctor/availability/overrides/${blockedOverrideId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Couldn't unblock this day.");
        return;
      }
      toast.success("Day unblocked");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  };

  if (blockedOverrideId) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={pending}
        onClick={unblock}
      >
        Unblock
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground"
      disabled={pending}
      onClick={block}
    >
      <Ban className="mr-1 h-3 w-3" />
      Block day
    </Button>
  );
}
