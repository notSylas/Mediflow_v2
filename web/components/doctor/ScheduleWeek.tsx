"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface ScheduleBand {
  id: string;
  kind: "rule" | "extra";
  startMin: number;
  endMin: number;
}

export interface ScheduleAppointment {
  id: string;
  startMin: number;
  endMin: number;
  patient: string;
  time: string;
  status: string;
  statusLabel: string;
}

export interface ScheduleDay {
  dateKey: string;
  weekday: number;
  dowLabel: string;
  dayLabel: string;
  fullLabel: string;
  weekdayName: string;
  isToday: boolean;
  isPast: boolean;
  blocked: boolean;
  blockedOverrideId: string | null;
  bands: ScheduleBand[];
  appointments: ScheduleAppointment[];
}

/** Pixels per hour. Tuned so a 12-hour day fits a laptop viewport without scrolling. */
const HOUR_PX = 56;
/** Drag/click snapping, in minutes. */
const SNAP = 15;
const DEFAULT_BLOCK_MIN = 60;

const pad = (n: number) => String(n).padStart(2, "0");
const toHHMM = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const fromHHMM = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
const label12 = (min: number) => {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${m ? `:${pad(m)}` : ""} ${h24 < 12 ? "am" : "pm"}`;
};

interface Draft {
  dayIndex: number;
  startMin: number;
  endMin: number;
}

export function ScheduleWeek({
  days,
  gridStartMin,
  gridEndMin,
  timezone,
}: {
  days: ScheduleDay[];
  gridStartMin: number;
  gridEndMin: number;
  timezone: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragging, setDragging] = useState<Draft | null>(null);
  const [pendingBand, setPendingBand] = useState<{
    band: ScheduleBand;
    day: ScheduleDay;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const totalMin = gridEndMin - gridStartMin;
  const gridHeight = (totalMin / 60) * HOUR_PX;

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let m = gridStartMin; m <= gridEndMin; m += 60) out.push(m);
    return out;
  }, [gridStartMin, gridEndMin]);

  const yToMin = (el: HTMLElement, clientY: number) => {
    const rect = el.getBoundingClientRect();
    const raw = gridStartMin + ((clientY - rect.top) / HOUR_PX) * 60;
    const snapped = Math.round(raw / SNAP) * SNAP;
    return Math.min(gridEndMin, Math.max(gridStartMin, snapped));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, dayIndex: number) => {
    // Only start a drag on the empty background, never on a band/appointment.
    if (event.target !== event.currentTarget) return;
    if (event.button !== 0) return;
    const start = yToMin(event.currentTarget, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({ dayIndex, startMin: start, endMin: start });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>, dayIndex: number) => {
    if (!dragging || dragging.dayIndex !== dayIndex) return;
    setDragging({ ...dragging, endMin: yToMin(event.currentTarget, event.clientY) });
  };

  const onPointerUp = () => {
    if (!dragging) return;
    const lo = Math.min(dragging.startMin, dragging.endMin);
    const hi = Math.max(dragging.startMin, dragging.endMin);
    const endMin = hi - lo < SNAP ? Math.min(gridEndMin, lo + DEFAULT_BLOCK_MIN) : hi;
    setDragging(null);
    if (endMin <= lo) return;
    setDraft({ dayIndex: dragging.dayIndex, startMin: lo, endMin });
  };

  const removeBand = async () => {
    if (!pendingBand) return;
    const { band } = pendingBand;
    setSaving(true);
    try {
      const url =
        band.kind === "rule"
          ? `/api/doctor/availability/rules/${band.id}`
          : `/api/doctor/availability/overrides/${band.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't remove those hours.");
        return;
      }
      toast.success("Hours removed");
      setPendingBand(null);
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const preview = dragging
    ? {
        dayIndex: dragging.dayIndex,
        startMin: Math.min(dragging.startMin, dragging.endMin),
        endMin: Math.max(dragging.startMin, dragging.endMin),
      }
    : null;

  return (
    <>
      {/* Desktop: true time grid. A doctor's real questions are "when am I free"
          and "where are the gaps" — both are spatial, so time runs down the
          y-axis instead of being written out as text ranges. */}
      <div className="hidden overflow-hidden rounded-xl border lg:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/30">
          <div />
          {days.map((day) => (
            <div
              key={day.dateKey}
              className={cn(
                "border-l px-2 py-2 text-center",
                day.isToday && "bg-primary/10"
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">{day.dowLabel}</p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  day.isToday && "text-primary"
                )}
              >
                {day.dayLabel}
              </p>
              {!day.blocked && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      dayIndex: days.indexOf(day),
                      startMin: defaultStartFor(day, gridStartMin),
                      endMin: Math.min(
                        gridEndMin,
                        defaultStartFor(day, gridStartMin) + DEFAULT_BLOCK_MIN
                      ),
                    })
                  }
                  className="mx-auto mt-1 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  <span className="sr-only">Add hours on {day.fullLabel}</span>
                  <span aria-hidden>Hours</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="max-h-[68vh] overflow-y-auto">
          <div
            className="relative grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]"
            style={{ height: gridHeight }}
          >
            <div className="relative">
              {hours.map((m) => (
                <div
                  key={m}
                  className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                  style={{ top: ((m - gridStartMin) / 60) * HOUR_PX }}
                >
                  {m < gridEndMin ? label12(m) : ""}
                </div>
              ))}
            </div>

            {days.map((day, dayIndex) => (
              <DayColumn
                key={day.dateKey}
                day={day}
                dayIndex={dayIndex}
                hours={hours}
                gridStartMin={gridStartMin}
                gridEndMin={gridEndMin}
                timezone={timezone}
                preview={preview?.dayIndex === dayIndex ? preview : null}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onBandClick={(band) => setPendingBand({ band, day })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Below lg a 7-column time grid is unreadable; fall back to an agenda
          list that keeps the same actions. */}
      <div className="space-y-3 lg:hidden">
        {days.map((day, dayIndex) => (
          <AgendaDay
            key={day.dateKey}
            day={day}
            onAdd={() =>
              setDraft({
                dayIndex,
                startMin: day.bands.length
                  ? Math.max(...day.bands.map((b) => b.endMin))
                  : 9 * 60,
                endMin:
                  (day.bands.length
                    ? Math.max(...day.bands.map((b) => b.endMin))
                    : 9 * 60) + DEFAULT_BLOCK_MIN,
              })
            }
            onRemoveBand={(band) => setPendingBand({ band, day })}
          />
        ))}
      </div>

      {draft && (
        <AddHoursDialog
          day={days[draft.dayIndex]}
          draft={draft}
          timezone={timezone}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      )}

      <AlertDialog
        open={Boolean(pendingBand)}
        onOpenChange={(open) => !open && setPendingBand(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove these hours?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBand?.band.kind === "rule" ? (
                <>
                  {label12(pendingBand.band.startMin)} – {label12(pendingBand.band.endMin)}{" "}
                  will be removed from <strong>every {pendingBand.day.weekdayName}</strong>,
                  not just this week. Existing bookings stay — patients simply can&apos;t
                  book these hours any more.
                </>
              ) : (
                <>
                  {pendingBand ? label12(pendingBand.band.startMin) : ""} –{" "}
                  {pendingBand ? label12(pendingBand.band.endMin) : ""} will be removed from{" "}
                  <strong>{pendingBand?.day.fullLabel}</strong>. Existing bookings stay.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep hours</AlertDialogCancel>
            <AlertDialogAction onClick={removeBand} disabled={saving}>
              {saving ? "Removing…" : "Remove hours"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DayColumn({
  day,
  dayIndex,
  hours,
  gridStartMin,
  gridEndMin,
  timezone,
  preview,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onBandClick,
}: {
  day: ScheduleDay;
  dayIndex: number;
  hours: number[];
  gridStartMin: number;
  gridEndMin: number;
  timezone: string;
  preview: { startMin: number; endMin: number } | null;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, i: number) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>, i: number) => void;
  onPointerUp: () => void;
  onBandClick: (band: ScheduleBand) => void;
}) {
  const top = (min: number) => ((min - gridStartMin) / 60) * HOUR_PX;
  const height = (a: number, b: number) => Math.max(((b - a) / 60) * HOUR_PX, 14);
  const nowMin = useNowMinutes(timezone, day.isToday);

  return (
    <div
      className={cn(
        "relative border-l",
        day.isToday && "bg-primary/[0.04]",
        day.blocked && "bg-destructive/[0.05]"
      )}
    >
      {hours.map((m) => (
        <div
          key={m}
          className="pointer-events-none absolute inset-x-0 border-t border-border/60"
          style={{ top: top(m) }}
        />
      ))}

      {/* Drag surface. Sits under the bands so pointerdown on a band doesn't
          start a drag (see the target check in onPointerDown). */}
      <div
        className={cn(
          "absolute inset-0",
          day.blocked ? "cursor-not-allowed" : "cursor-cell"
        )}
        onPointerDown={(e) => !day.blocked && onPointerDown(e, dayIndex)}
        onPointerMove={(e) => !day.blocked && onPointerMove(e, dayIndex)}
        onPointerUp={onPointerUp}
        role="presentation"
      />

      {!day.blocked &&
        day.bands.map((band) => (
          <button
            key={band.id}
            type="button"
            onClick={() => onBandClick(band)}
            title={`${label12(band.startMin)} – ${label12(band.endMin)} · click to remove`}
            className={cn(
              "absolute inset-x-1 rounded-md border text-left transition-colors",
              band.kind === "rule"
                ? "border-primary/25 bg-primary/10 hover:bg-primary/20"
                : "border-dashed border-primary/40 bg-primary/5 hover:bg-primary/15"
            )}
            style={{ top: top(band.startMin), height: height(band.startMin, band.endMin) }}
          >
            <span className="sr-only">
              Available {label12(band.startMin)} to {label12(band.endMin)} on{" "}
              {band.kind === "rule" ? `every ${day.weekdayName}` : day.fullLabel}. Remove.
            </span>
          </button>
        ))}

      {preview && (
        <div
          className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-primary bg-primary/20"
          style={{
            top: top(preview.startMin),
            height: height(preview.startMin, preview.endMin),
          }}
        >
          <span className="px-1 text-[10px] font-medium tabular-nums text-primary">
            {label12(preview.startMin)}–{label12(preview.endMin)}
          </span>
        </div>
      )}

      {day.appointments.map((appt) => (
        <Link
          key={appt.id}
          href={`/doctor/encounter/${appt.id}`}
          title={`${appt.time} · ${appt.patient} · ${appt.statusLabel}`}
          className={cn(
            "absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight shadow-sm transition-opacity hover:opacity-85",
            appt.status === "completed"
              ? "border bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground"
          )}
          style={{ top: top(appt.startMin), height: height(appt.startMin, appt.endMin) }}
        >
          <span className="block truncate font-medium tabular-nums">{appt.time}</span>
          <span className="block truncate">{appt.patient}</span>
        </Link>
      ))}

      {nowMin !== null && nowMin >= gridStartMin && nowMin <= gridEndMin && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
          style={{ top: top(nowMin) }}
        >
          <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Current time</span>
        </div>
      )}

      {day.blocked && (
        <div className="pointer-events-none absolute inset-x-1 top-1 flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
          <Ban className="h-3 w-3" /> Day off
        </div>
      )}

    </div>
  );
}

/**
 * Where the "+ Hours" button in a day header should start a new block: right
 * after the day's existing hours, or 9am on an empty day.
 */
function defaultStartFor(day: ScheduleDay, gridStartMin: number) {
  if (day.bands.length > 0) return Math.max(...day.bands.map((b) => b.endMin));
  return Math.max(gridStartMin, 9 * 60);
}

function AgendaDay({
  day,
  onAdd,
  onRemoveBand,
}: {
  day: ScheduleDay;
  onAdd: () => void;
  onRemoveBand: (band: ScheduleBand) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        day.isToday && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {day.dowLabel}
          <span className="ml-1.5 font-normal text-muted-foreground">{day.fullLabel}</span>
        </p>
        {!day.blocked && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAdd}>
            <Plus className="mr-1 h-3 w-3" /> Add hours
          </Button>
        )}
      </div>

      {day.blocked ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <Ban className="h-3 w-3" /> Day off
        </p>
      ) : day.bands.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No hours set.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {day.bands.map((band) => (
            <li
              key={band.id}
              className="flex items-center justify-between gap-2 rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground"
            >
              <span className="tabular-nums">
                {label12(band.startMin)} – {label12(band.endMin)}
                {band.kind === "extra" && (
                  <span className="ml-1 text-muted-foreground">(this date only)</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onRemoveBand(band)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${label12(band.startMin)} to ${label12(band.endMin)}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {day.appointments.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t pt-2">
          {day.appointments.map((appt) => (
            <Link
              key={appt.id}
              href={`/doctor/encounter/${appt.id}`}
              className={cn(
                "block truncate rounded-md px-2 py-1 text-xs",
                appt.status === "completed"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <span className="tabular-nums">{appt.time}</span> · {appt.patient}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddHoursDialog({
  day,
  draft,
  timezone,
  onClose,
  onSaved,
}: {
  day: ScheduleDay;
  draft: Draft;
  timezone: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState(toHHMM(draft.startMin));
  const [end, setEnd] = useState(toHHMM(draft.endMin));
  const [scope, setScope] = useState<"rule" | "extra">("rule");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (fromHHMM(start) >= fromHHMM(end)) {
      setError("Start time must be before end time.");
      return;
    }
    setSaving(true);
    try {
      const res =
        scope === "rule"
          ? await fetch("/api/doctor/availability/rules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ weekday: day.weekday, startTime: start, endTime: end }),
            })
          : await fetch("/api/doctor/availability/overrides", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: day.dateKey,
                kind: "extra",
                startTime: start,
                endTime: end,
              }),
            });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.error === "string"
            ? body.error
            : (body?.error?.[0]?.message ?? "Couldn't save those hours.")
        );
        return;
      }
      toast.success(
        scope === "rule" ? `Added to every ${day.weekdayName}` : `Added to ${day.fullLabel}`
      );
      onSaved();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add consulting hours</DialogTitle>
          <DialogDescription>
            Patients can book {timezone.replace("_", " ")} slots inside these hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="hours-start">Start</Label>
              <Input
                id="hours-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="hours-end">End</Label>
              <Input
                id="hours-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Repeat</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "rule" | "extra")}
              className="gap-2"
            >
              <label
                htmlFor="scope-rule"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value="rule" id="scope-rule" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Every {day.weekdayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    Part of your regular weekly hours.
                  </span>
                </span>
              </label>
              <label
                htmlFor="scope-extra"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value="extra" id="scope-extra" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Only {day.fullLabel}</span>
                  <span className="block text-xs text-muted-foreground">
                    A one-off extra clinic on this date.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Add hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Current time in the doctor's timezone, as minutes past midnight. */
function useNowMinutes(timezone: string, enabled: boolean) {
  const [min, setMin] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const read = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setMin(fromHHMM(parts));
    };
    read();
    const id = setInterval(read, 60_000);
    return () => clearInterval(id);
  }, [enabled, timezone]);

  return enabled ? min : null;
}
