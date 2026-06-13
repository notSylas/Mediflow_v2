"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface AvailabilityOverride {
  id: string;
  date: string;
  kind: "blocked" | "extra";
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export function OverridesEditor({
  initialOverrides,
}: {
  initialOverrides: AvailabilityOverride[];
}) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"blocked" | "extra">("blocked");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const useTimeRange = kind === "extra" || !allDay;

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!date) {
      setError("Date is required.");
      return;
    }

    if (useTimeRange && startTime >= endTime) {
      setError("Start time must be before end time.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/doctor/availability/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          kind,
          startTime: useTimeRange ? startTime : null,
          endTime: useTimeRange ? endTime : null,
          reason: reason.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add override");
      }

      const created: AvailabilityOverride = await response.json();
      setOverrides((prev) =>
        [...prev, created].sort((a, b) => a.date.localeCompare(b.date))
      );
      setReason("");
    } catch {
      setError("Failed to add override. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setOverrides((prev) => prev.filter((override) => override.id !== id));
    await fetch(`/api/doctor/availability/overrides/${id}`, {
      method: "DELETE",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date overrides</CardTitle>
        <CardDescription>
          Block specific days off, or add an extra one-off session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overrides yet.</p>
        ) : (
          <ul className="space-y-1">
            {overrides.map((override) => (
              <li
                key={override.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {override.date} —{" "}
                  {override.kind === "blocked" ? "Blocked" : "Extra session"}
                  {override.startTime && override.endTime
                    ? ` (${override.startTime.slice(0, 5)} – ${override.endTime.slice(0, 5)})`
                    : override.kind === "blocked"
                      ? " (full day)"
                      : ""}
                  {override.reason ? ` — ${override.reason}` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(override.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Separator />

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="override-date">Date</Label>
              <Input
                id="override-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="override-kind">Type</Label>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as "blocked" | "extra")}
              >
                <SelectTrigger id="override-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocked">Blocked (day off)</SelectItem>
                  <SelectItem value="extra">Extra session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {kind === "blocked" && (
            <div className="flex items-center gap-2">
              <input
                id="override-all-day"
                type="checkbox"
                checked={allDay}
                onChange={(event) => setAllDay(event.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="override-all-day">Block the entire day</Label>
            </div>
          )}

          {useTimeRange && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="override-start">Start</Label>
                <Input
                  id="override-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="override-end">End</Label>
                <Input
                  id="override-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="override-reason">Reason (optional)</Label>
            <Input
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Holiday"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Adding..." : "Add override"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
