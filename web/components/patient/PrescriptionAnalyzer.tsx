"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Minus,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AnalyzedMedication,
  AnalyzedPrescription,
} from "~backend/prescriptions/analysis";

type Status = "queued" | "processing" | "succeeded" | "failed";

interface Analysis {
  id: string;
  status: Status;
  filename: string;
  overallConfidence: number | null;
  result: AnalyzedPrescription | null;
  error: string | null;
}

// Mirrors MAX_ANALYSIS_BYTES — Cloud Run's request-body ceiling.
const MAX_BYTES = 32 * 1024 * 1024;
const POLL_MS = 2000;
/** Two 300-DPI vision passes; used only to pace the progress bar. */
const TYPICAL_SECONDS = 45;

/**
 * Upload a prescription and watch it being read.
 *
 * The analysis runs as a Cloud Run Job that takes 20-60s, so this uploads,
 * gets a queued row back, then polls until the row reaches a terminal state.
 * The bar is time-based rather than a real percentage — the job reports
 * queued/processing, not progress — so it eases toward 90% and only completes
 * when the server says so, rather than pretending to know.
 */
export function PrescriptionAnalyzer() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || (analysis !== null && analysis.status !== "succeeded" && analysis.status !== "failed");

  // Poll while the row is not terminal.
  useEffect(() => {
    if (!analysis || analysis.status === "succeeded" || analysis.status === "failed") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/prescription-analyses/${analysis.id}`);
        if (!res.ok) return;
        const body = await res.json();
        setAnalysis(body.analysis);
      } catch {
        // Transient network blip; the next tick retries.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [analysis]);

  // Drive the indeterminate progress bar.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const upload = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That file is larger than 32 MB. Try compressing the scan.");
      return;
    }

    setUploading(true);
    setUploadPct(0);
    setElapsed(0);
    setAnalysis(null);

    const body = new FormData();
    body.append("file", file);

    try {
      // XHR rather than fetch: it reports real upload progress, which fetch
      // still cannot do for request bodies.
      const analysisRow = await new Promise<Analysis>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/v1/prescription-analyses");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          let parsed: { analysis?: Analysis; error?: unknown } = {};
          try {
            parsed = JSON.parse(xhr.responseText);
          } catch {
            /* fall through to the generic message below */
          }
          if (xhr.status >= 200 && xhr.status < 300 && parsed.analysis) {
            resolve(parsed.analysis);
          } else {
            reject(
              new Error(
                typeof parsed.error === "string"
                  ? parsed.error
                  : "Upload failed. Please try again."
              )
            );
          }
        };
        xhr.onerror = () => reject(new Error("Couldn't reach the server."));
        xhr.send(body);
      });

      setUploadPct(100);
      setAnalysis(analysisRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const status: Status | "uploading" | null = uploading
    ? "uploading"
    : (analysis?.status ?? null);

  return (
    <div className="space-y-6">
      {!busy && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          )}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">
            Drop a prescription here, or choose a file
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF or photo. Reading it takes about a minute.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp,image/tiff,image/bmp"
            className="sr-only"
            aria-label="Prescription file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {busy && (
        <ProgressPanel
          status={status}
          uploadPct={uploadPct}
          elapsed={elapsed}
          filename={analysis?.filename}
        />
      )}

      {analysis?.status === "failed" && (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            We couldn&apos;t read this prescription
          </p>
          <p className="text-sm text-muted-foreground">
            {analysis.error ?? "Something went wrong while analysing the file."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setAnalysis(null)}>
            Try another file
          </Button>
        </div>
      )}

      {analysis?.status === "succeeded" && analysis.result && (
        <AnalysisResult
          result={analysis.result}
          filename={analysis.filename}
          onReset={() => setAnalysis(null)}
        />
      )}
    </div>
  );
}

function ProgressPanel({
  status,
  uploadPct,
  elapsed,
  filename,
}: {
  status: Status | "uploading" | null;
  uploadPct: number;
  elapsed: number;
  filename?: string;
}) {
  // Upload is a real percentage. Analysis is not — the job reports a state,
  // not progress — so ease toward 90% and let the poll finish it.
  const analysing = status === "queued" || status === "processing";
  const pct = status === "uploading" ? uploadPct : Math.min(90, (elapsed / TYPICAL_SECONDS) * 90);

  const label =
    status === "uploading"
      ? `Uploading… ${uploadPct}%`
      : status === "queued"
        ? "Queued — waiting for an analyzer"
        : "Reading the prescription…";

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        {label}
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filename ? `${filename} · ` : ""}
        {analysing
          ? `Two reading passes — about a minute. ${elapsed}s elapsed.`
          : "Sending the file…"}
      </p>
    </div>
  );
}

/** Time slots a dose can fall in, in the order a day runs. */
const SLOTS = [
  { key: "morning", label: "Morning", short: "M", icon: Sunrise },
  { key: "afternoon", label: "Afternoon", short: "A", icon: Sun },
  { key: "evening", label: "Evening", short: "E", icon: Sunset },
  { key: "night", label: "Night", short: "N", icon: Moon },
] as const;

/**
 * Reads dosing shorthand into the four slots for the schedule grid.
 * Mirrors the mapping in backend/vault/vault-extraction.ts — kept in the UI so
 * the grid works off whatever the analyzer read, without a second round trip.
 * Anything unrecognised returns null, which renders as "not read" rather than
 * an invented schedule.
 */
function slotsFor(m: AnalyzedMedication): Record<string, boolean> | null {
  const text = (m.frequency_raw ?? m.frequency ?? "").trim().toLowerCase();
  if (!text) return null;

  const positional = text.match(/^(\d)\s*-\s*(\d)\s*-\s*(\d)(?:\s*-\s*(\d))?$/);
  if (positional) {
    const [, a, b, c, d] = positional;
    return d !== undefined
      ? { morning: a !== "0", afternoon: b !== "0", evening: c !== "0", night: d !== "0" }
      : { morning: a !== "0", afternoon: b !== "0", evening: false, night: c !== "0" };
  }
  if (/\bhs\b|bedtime|at night/.test(text))
    return { morning: false, afternoon: false, evening: false, night: true };
  if (/\bod\b|once daily/.test(text))
    return { morning: true, afternoon: false, evening: false, night: false };
  if (/\bbd\b|\bbid\b|twice/.test(text))
    return { morning: true, afternoon: false, evening: false, night: true };
  if (/\btds\b|\btid\b|three times/.test(text))
    return { morning: true, afternoon: true, evening: false, night: true };
  if (/\bqid\b|four times/.test(text))
    return { morning: true, afternoon: true, evening: true, night: true };
  return null;
}

/**
 * When to take this medicine, as four time-of-day cells rather than a sentence.
 *
 * The four slots are always shown — a dimmed cell means "not at this time",
 * which is information too. Reading "1-0-1" off a card is a parsing task;
 * seeing which of four cells are lit is not.
 *
 * Never colour-alone: each cell carries an icon, a word, and screen-reader text
 * saying take/skip.
 */
function DoseSlots({ slots }: { slots: Record<string, boolean> }) {
  return (
    <ul className="flex gap-1.5" aria-label="When to take this medicine">
      {SLOTS.map((s) => {
        const take = slots[s.key];
        const Icon = s.icon;
        return (
          <li
            key={s.key}
            className={cn(
              "flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 transition-colors",
              take
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-transparent bg-foreground/[0.04] text-foreground/35"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className={cn("text-[11px]", take ? "font-semibold" : "font-medium")}>
              {s.label}
            </span>
            <span className="sr-only">
              {take ? `Take in the ${s.label.toLowerCase()}` : `Not in the ${s.label.toLowerCase()}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Confidence as a meter, not a chart: it is one ratio against a limit, so a
 * track + fill in a single hue is the honest form. Colour is never the only
 * signal — the number is always shown beside it.
 */
function ConfidenceMeter({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-foreground/70">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
        role="img"
        aria-label={`${label}: ${pct} percent`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

/** One headline number. Per the form heuristic: a stat tile, not a one-bar chart. */
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <p className="font-mono text-xl font-semibold tabular-nums leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Lab status. Colour alone never carries the meaning — every cell has a word,
 * and "normal" stays neutral rather than green: in this design system green is
 * reserved for paid/confirmed (docs/Design.md).
 */
function LabStatus({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  if (s === "high" || s === "low") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
        <TrendingUp className={cn("h-3 w-3", s === "low" && "rotate-180")} aria-hidden />
        {s === "high" ? "High" : "Low"}
      </span>
    );
  }
  if (s === "normal") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.07] px-2 py-0.5 text-xs font-medium text-foreground/70">
        <Minus className="h-3 w-3" aria-hidden />
        Normal
      </span>
    );
  }
  return null;
}

function AnalysisResult({
  result,
  filename,
  onReset,
}: {
  result: AnalyzedPrescription;
  filename: string;
  onReset: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const scheduled = result.medications
    .map((m) => ({ med: m, slots: slotsFor(m) }))
    .filter((r) => r.slots !== null) as { med: AnalyzedMedication; slots: Record<string, boolean> }[];

  return (
    <div className="space-y-6">
      {/* Hero. docs/Design.md allows depth on "the prescription panel" — this is
          that surface, so it carries the identity gradient the rest of the page
          deliberately does not. */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-transparent p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate text-sm font-semibold text-foreground">{filename}</span>
            </div>
            <p className="mt-1 text-sm text-foreground/70">
              {result.doctor.name ?? "Doctor not read"}
              {result.doctor.specialty ? ` · ${result.doctor.specialty}` : ""}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            Analyse another
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <ConfidenceMeter value={result.overall_confidence} label="Overall read confidence" />
          <div className="grid grid-cols-4 gap-2 sm:w-[22rem]">
            <Stat value={result.medications.length} label="Medicines" />
            <Stat value={result.lab_findings.length} label="Labs" />
            <Stat value={result.vitals.length} label="Vitals" />
            <Stat value={result.pages_analyzed} label="Pages" />
          </div>
        </div>
      </div>

      {/* Never let an extraction pass read as fact — a low-confidence drug name
          is a safety issue, not a UI nicety. */}
      <p className="flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Read by AI from the image — always check it against the original before
          acting on it. Anything marked <strong>VERIFY</strong> was uncertain.
        </span>
      </p>

      {result.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-300/70 bg-amber-50/70 p-3 text-sm text-amber-950">
          {result.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      {/* Per-time view. The cards below already answer "when do I take THIS
          medicine"; this answers the inverse — "it is morning, what do I take"
          — which is the question a patient actually has, standing at the shelf.
          Same data, different index, so it earns its place rather than
          repeating the cards. */}
      {scheduled.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Your day</h3>
          <div className="grid gap-2 sm:grid-cols-4">
            {SLOTS.map((slot) => {
              const meds = scheduled.filter(({ slots }) => slots[slot.key]);
              const Icon = slot.icon;
              return (
                <div
                  key={slot.key}
                  className={cn(
                    "rounded-xl border p-3",
                    meds.length ? "bg-card" : "bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      meds.length ? "text-primary" : "text-foreground/40"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="text-xs font-semibold">{slot.label}</span>
                  </div>
                  {meds.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {meds.map(({ med }, i) => (
                        <li key={i} className="text-sm font-medium text-foreground">
                          {med.name ?? med.raw_text ?? "Unreadable"}
                          {med.strength && (
                            <span className="ml-1 font-mono text-xs font-normal tabular-nums text-muted-foreground">
                              {med.strength}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-foreground/40">Nothing</p>
                  )}
                </div>
              );
            })}
          </div>
          {scheduled.length < result.medications.length && (
            <p className="text-xs text-muted-foreground">
              {result.medications.length - scheduled.length} medicine
              {result.medications.length - scheduled.length === 1 ? "" : "s"} had no
              schedule we could read — see the list below.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Doctor">
          <Field label="Name" value={result.doctor.name} />
          <Field label="Specialty" value={result.doctor.specialty} />
          <Field label="Qualifications" value={result.doctor.qualifications.join(", ") || null} />
          <Field label="Reg. no" value={result.doctor.registration_no} />
          <Field label="Clinic" value={result.doctor.clinic_or_hospital} />
        </Section>
        <Section title="Patient">
          <Field label="Name" value={result.patient.name} />
          <Field label="Age" value={result.patient.age} />
          <Field label="Sex" value={result.patient.sex} />
          <Field label="Weight" value={result.patient.weight} />
          <Field label="Date" value={result.patient.date} />
        </Section>
      </div>

      {result.medications.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Medications</h3>
          <ul className="space-y-2">
            {result.medications.map((m, i) => (
              <li key={`${m.name ?? "med"}-${i}`} className="rounded-xl border bg-card p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {m.name ?? "Unreadable"}
                  </span>
                  {m.strength && (
                    <span className="font-mono text-sm tabular-nums text-foreground/80">
                      {m.strength}
                    </span>
                  )}
                  {m.needs_verification && (
                    <Badge variant="destructive" className="text-[11px]">
                      VERIFY
                    </Badge>
                  )}
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {Math.round(m.confidence * 100)}% sure
                  </span>
                </div>
                {m.generic_name && (
                  <p className="mt-0.5 text-sm text-foreground/70">{m.generic_name}</p>
                )}

                {(() => {
                  const slots = slotsFor(m);
                  // No readable schedule: show what was written rather than an
                  // empty row of cells, which would imply "take none of these".
                  return slots ? (
                    <div className="mt-2.5">
                      <DoseSlots slots={slots} />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-foreground/80">
                      {m.frequency ?? m.frequency_raw ?? "No dosing schedule read"}
                    </p>
                  );
                })()}

                {[m.dose, m.route, m.duration, m.instructions].filter(Boolean).length > 0 && (
                  <p className="mt-2 text-sm text-foreground/75">
                    {[m.dose, m.route, m.duration, m.instructions].filter(Boolean).join(" · ")}
                  </p>
                )}
                {m.raw_text && (
                  <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                    as written: {m.raw_text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.vitals.length > 0 && (
          <Section title="Vitals">
            {result.vitals.map((v, i) => (
              <Field key={i} label={v.name ?? "—"} value={v.value} />
            ))}
          </Section>
        )}
        {result.lab_findings.length > 0 && (
          <div className="rounded-xl border bg-card p-3.5">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Lab findings</h3>
            <ul className="space-y-1.5">
              {result.lab_findings.map((l, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground/80">{l.name ?? "—"}</span>
                  <span className="flex items-center gap-2">
                    {l.value && (
                      <span className="font-mono tabular-nums font-medium text-foreground">
                        {l.value}
                      </span>
                    )}
                    <LabStatus status={l.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {result.diagnosis.length > 0 && (
        <Section title="Diagnosis">
          <ul className="space-y-1 text-sm text-foreground/85">
            {result.diagnosis.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
        </Section>
      )}

      {(result.investigations.length > 0 || result.advice.length > 0 || result.follow_up) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.investigations.length > 0 && (
            <Section title="Tests ordered">
              <ul className="space-y-1 text-sm text-foreground/85">
                {result.investigations.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </Section>
          )}
          {(result.advice.length > 0 || result.follow_up) && (
            <Section title="Advice">
              <ul className="space-y-1 text-sm text-foreground/85">
                {result.advice.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
                {result.follow_up && <li>• Follow-up: {result.follow_up}</li>}
              </ul>
            </Section>
          )}
        </div>
      )}

      {result.raw_transcription && (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? "Hide" : "Show"} raw transcription
          </Button>
          {showRaw && (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-xs text-foreground/85">
              {result.raw_transcription}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="flex justify-between gap-3 text-sm">
      <span className="text-foreground/60">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </p>
  );
}
