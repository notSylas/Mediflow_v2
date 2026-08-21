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

interface AvailabilityRule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function AvailabilityRulesEditor({
  initialRules,
}: {
  initialRules: AvailabilityRule[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (startTime >= endTime) {
      setError("Start time must be before end time.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/doctor/availability/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: Number(weekday),
          startTime,
          endTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add availability");
      }

      const created: AvailabilityRule = await response.json();
      setRules((prev) => [...prev, created]);
    } catch {
      setError("Failed to add availability. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
    await fetch(`/api/doctor/availability/rules/${id}`, { method: "DELETE" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly availability</CardTitle>
        <CardDescription>
          Set the recurring hours patients can book each week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {WEEKDAYS.map((label, day) => {
            const dayRules = rules
              .filter((rule) => rule.weekday === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div key={day} className="space-y-2">
                <p className="text-sm font-medium">{label}</p>
                {dayRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hours set.</p>
                ) : (
                  <ul className="space-y-1">
                    {dayRules.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {rule.startTime.slice(0, 5)} – {rule.endTime.slice(0, 5)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="rule-weekday">Day</Label>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger id="rule-weekday" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((label, day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-start">Start</Label>
            <Input
              id="rule-start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-end">End</Label>
            <Input
              id="rule-end"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Adding..." : "Add range"}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
