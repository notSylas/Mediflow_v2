"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AnalyzedPrescription } from "~backend/prescriptions/analysis";

type Status = "queued" | "processing" | "succeeded" | "failed";

interface Analysis {
  id: string;
  status: Status;
  filename: string;
  overallConfidence: number | null;
  result: AnalyzedPrescription | null;
  error: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024;
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
      setError("That file is larger than 5 MB. Try a smaller scan or photo.");
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
            PDF or photo, up to 5 MB. Reading it takes about a minute.
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

function confidenceTone(confidence: number) {
  if (confidence >= 0.8) return "bg-success/15 text-success-foreground";
  if (confidence >= 0.5) return "bg-amber-100 text-amber-800";
  return "bg-destructive/10 text-destructive";
}

function ConfidencePill({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
        confidenceTone(value)
      )}
    >
      {Math.round(value * 100)}%
    </span>
  );
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">{filename}</span>
          <ConfidencePill value={result.overall_confidence} />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Analyse another
        </Button>
      </div>

      {/* Never let an extraction pass read as fact — a low-confidence drug
          name is a safety issue, not a UI nicety. */}
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Read by AI from the image — always check it against the original before
        acting on it. Anything marked <strong>VERIFY</strong> was uncertain.
      </p>

      {result.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
          {result.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
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
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Medications</h3>
          <ul className="space-y-2">
            {result.medications.map((m, i) => (
              <li key={`${m.name ?? "med"}-${i}`} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{m.name ?? "Unreadable"}</span>
                  {m.strength && (
                    <span className="text-sm text-muted-foreground">{m.strength}</span>
                  )}
                  <ConfidencePill value={m.confidence} />
                  {m.needs_verification && (
                    <Badge variant="destructive" className="text-[10px]">
                      VERIFY
                    </Badge>
                  )}
                </div>
                {m.generic_name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.generic_name}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {[m.dose, m.frequency, m.route, m.duration, m.instructions]
                    .filter(Boolean)
                    .join(" · ") || "No dosing details read"}
                </p>
                {m.raw_text && (
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                    as written: {m.raw_text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
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
          <Section title="Lab findings">
            {result.lab_findings.map((l, i) => (
              <Field
                key={i}
                label={l.name ?? "—"}
                value={[l.value, l.status].filter(Boolean).join(" · ") || null}
              />
            ))}
          </Section>
        )}
      </div>

      {result.diagnosis.length > 0 && (
        <Section title="Diagnosis">
          <ul className="text-sm">
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
              <ul className="text-sm">
                {result.investigations.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </Section>
          )}
          {(result.advice.length > 0 || result.follow_up) && (
            <Section title="Advice">
              <ul className="text-sm">
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? "Hide" : "Show"} raw transcription
          </Button>
          {showRaw && (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
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
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </p>
  );
}
