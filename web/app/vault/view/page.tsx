"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, FolderHeart, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface Medicine {
  name: string;
  strength: string | null;
  route: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string | null;
  durationDays: number | null;
  instructions: string | null;
}

type LabResultFlag = "normal" | "high" | "low" | "critical";

interface Vitals {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulseRate: number | null;
  temperatureCelsius: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
}

interface LabResult {
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: LabResultFlag | null;
}

interface VaccineDetails {
  vaccineName: string | null;
  doseNumber: string | null;
  batchNumber: string | null;
  route: string | null;
  site: string | null;
  nextDueDate: string | null;
}

const FLAG_BADGE_CLASS: Record<LabResultFlag, string> = {
  normal: "border-transparent bg-muted text-muted-foreground",
  high: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-sky-300 bg-sky-50 text-sky-800",
  critical: "border-transparent bg-destructive/10 text-destructive",
};

function vitalsChips(v: Vitals | null): string[] {
  if (!v) return [];
  const chips: string[] = [];
  if (v.bpSystolic != null || v.bpDiastolic != null) {
    chips.push(`BP ${v.bpSystolic ?? "—"}/${v.bpDiastolic ?? "—"} mmHg`);
  }
  if (v.pulseRate != null) chips.push(`Pulse ${v.pulseRate} bpm`);
  if (v.temperatureCelsius != null) chips.push(`Temp ${v.temperatureCelsius}°C`);
  if (v.spo2 != null) chips.push(`SpO2 ${v.spo2}%`);
  if (v.weightKg != null) chips.push(`${v.weightKg} kg`);
  if (v.heightCm != null) chips.push(`${v.heightCm} cm`);
  return chips;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  advice: string | null;
  issuedAt: string | null;
  doctorName: string;
  medicines: Medicine[];
}

interface ConsultNote {
  date: string;
  doctorName: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
}

interface PageSnapshot {
  pageIndex: number;
  mimeType: string;
  dataBase64: string;
}

interface Diagram {
  pageIndex: number;
  confidence: number;
  mimeType: string;
  dataBase64: string;
}

interface AddedRecord {
  recordType: string;
  date: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  diagnosisCode: string | null;
  advice: string | null;
  medicines: Medicine[];
  vitals: Vitals | null;
  labResults: LabResult[];
  findings: string | null;
  admissionDate: string | null;
  vaccineDetails: VaccineDetails | null;
  wasEdited: boolean;
  // Absent on shares created before this field existed — the encrypted
  // bundle simply doesn't have it, so this is optional, not just empty.
  pageSnapshots?: PageSnapshot[];
  diagrams?: Diagram[];
}

interface RedeemedVault {
  patientName: string;
  scope: { from: string | null; to: string };
  prescriptions: Prescription[];
  consultNotes: ConsultNote[];
  addedRecords: AddedRecord[];
}

const RECORD_TYPE_LABEL: Record<string, string> = {
  prescription: "Prescription",
  lab: "Lab report",
  scan: "Scan",
  discharge_summary: "Discharge summary",
  vaccination: "Vaccination",
  other: "Record",
};

function doseSummary(m: Medicine): string {
  const slots = (["morning", "afternoon", "evening", "night"] as const).filter((s) => m[s]);
  const parts = [
    m.strength,
    slots.length ? slots.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ") : "As needed",
    m.durationDays ? `${m.durationDays} day${m.durationDays === 1 ? "" : "s"}` : null,
    m.foodRelation,
  ].filter(Boolean);
  return parts.join(" · ");
}

/**
 * Shared letterhead treatment for a prescription or added record — same
 * structural language as the patient's own record detail page, so what a
 * receiving doctor sees here reads as one consistent, professional document
 * format rather than an ad-hoc list. Flat per Design.md's dense-content
 * rule; the accent bar is the only "branding" element, no glass/blur.
 */
function DocumentCard({
  badgeLabel,
  title,
  subtitle,
  diagnosisCode,
  date,
  admissionDate,
  vitals,
  labResults,
  medicines,
  vaccineDetails,
  findings,
  advice,
  editedBadge,
  pageSnapshots,
  diagrams,
}: {
  badgeLabel: string;
  title: string;
  subtitle: string;
  diagnosisCode?: string | null;
  date: string | null;
  admissionDate?: string | null;
  vitals?: Vitals | null;
  labResults?: LabResult[];
  medicines: Medicine[];
  vaccineDetails?: VaccineDetails | null;
  findings?: string | null;
  advice: string | null;
  editedBadge?: boolean;
  pageSnapshots?: PageSnapshot[];
  diagrams?: Diagram[];
}) {
  const chips = vitalsChips(vitals ?? null);
  const shownLabResults = (labResults ?? []).filter((r) => r.testName.trim());
  const hasVaccine = Boolean(vaccineDetails?.vaccineName);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="h-1.5 bg-primary" />
      <div className="p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{badgeLabel}</Badge>
              {editedBadge ? (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Edited by patient
                </Badge>
              ) : null}
            </div>
            <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {subtitle}
              {diagnosisCode ? ` · ${diagnosisCode}` : ""}
            </p>
          </div>
          {date ? (
            <div className="shrink-0 rounded-xl border bg-background/60 px-3.5 py-2.5 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <p className="font-mono text-sm font-semibold tabular-nums">
                {new Date(date).toLocaleDateString()}
              </p>
              {admissionDate ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Admitted {new Date(admissionDate).toLocaleDateString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        {chips.length > 0 ? (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vitals
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border bg-background/60 px-3 py-1 text-xs font-medium"
                >
                  {chip}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {shownLabResults.length > 0 ? (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lab results
            </p>
            <div className="overflow-hidden rounded-xl border">
              {shownLabResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 border-b p-3 text-sm last:border-b-0 odd:bg-background/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{r.testName}</p>
                    <p className="text-muted-foreground">
                      {[r.value, r.unit].filter(Boolean).join(" ")}
                      {r.referenceRange ? ` · Ref: ${r.referenceRange}` : ""}
                    </p>
                  </div>
                  {r.flag ? (
                    <Badge className={`shrink-0 border capitalize ${FLAG_BADGE_CLASS[r.flag]}`}>
                      {r.flag}
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {medicines.length > 0 ? (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Medicines
            </p>
            <div className="overflow-hidden rounded-xl border">
              {medicines.map((m, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b p-3 text-sm last:border-b-0 odd:bg-background/40"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-muted-foreground">{doseSummary(m)}</p>
                    {m.instructions ? (
                      <p className="text-muted-foreground">{m.instructions}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {hasVaccine ? (
          <section className="mt-4 rounded-xl border bg-background/40 p-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vaccine details
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {[
                ["Vaccine", vaccineDetails?.vaccineName],
                ["Dose", vaccineDetails?.doseNumber],
                ["Batch", vaccineDetails?.batchNumber],
                ["Route", vaccineDetails?.route],
                ["Site", vaccineDetails?.site],
                [
                  "Next due",
                  vaccineDetails?.nextDueDate
                    ? new Date(vaccineDetails.nextDueDate).toLocaleDateString()
                    : null,
                ],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ) : null}

        {findings ? (
          <section className="mt-4 rounded-xl border bg-background/40 p-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Findings
            </p>
            <p className="text-sm">{findings}</p>
          </section>
        ) : null}

        {advice ? (
          <section className="mt-4 rounded-xl border bg-background/40 p-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Advice
            </p>
            <p className="text-sm">{advice}</p>
          </section>
        ) : null}

        {pageSnapshots && pageSnapshots.length > 0 ? (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Original page{pageSnapshots.length > 1 ? "s" : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {pageSnapshots.map((p, i) => (
                <figure key={i} className="overflow-hidden rounded-xl border bg-background/40 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${p.mimeType};base64,${p.dataBase64}`}
                    alt={`Page ${p.pageIndex + 1} of the original document`}
                    className="w-full rounded-lg bg-white object-contain"
                  />
                  <figcaption className="mt-2 text-xs text-muted-foreground">
                    Page {p.pageIndex + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {diagrams && diagrams.length > 0 ? (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Doctor&apos;s drawing{diagrams.length > 1 ? "s" : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {diagrams.map((d, i) => (
                <figure key={i} className="overflow-hidden rounded-xl border bg-background/40 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${d.mimeType};base64,${d.dataBase64}`}
                    alt={`Hand-drawn diagram from page ${d.pageIndex + 1}`}
                    className="w-full rounded-lg bg-white object-contain"
                  />
                  <figcaption className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Page {d.pageIndex + 1}</span>
                    <span className="font-mono tabular-nums">{d.confidence}% match</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function VaultViewInner() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RedeemedVault | null>(null);

  const redeem = async (submittedCode: string) => {
    if (!submittedCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/vault/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submittedCode.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.");
        setData(null);
        return;
      }
      setData(body as RedeemedVault);
    } catch {
      setError("Couldn't reach MediFlow. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Deliberate one-shot auto-submit of the code carried in the URL. `redeem`
    // flips loading state synchronously, which costs exactly one extra render
    // on mount — not the cascading-render case the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialCode) void redeem(initialCode);
    // Only auto-submit once, on the code carried in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data) {
    const isEmpty =
      data.prescriptions.length === 0 &&
      data.consultNotes.length === 0 &&
      data.addedRecords.length === 0;

    return (
      <div className="min-h-screen bg-muted/20">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span>
                Shared by <span className="font-semibold">{data.patientName}</span>
              </span>
            </div>
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              Read-only
            </Badge>
          </div>

          {isEmpty ? (
            <Card className="p-6 text-center text-muted-foreground">
              Nothing in the shared window ({data.scope.from ? "recent" : "all time"} through today).
            </Card>
          ) : (
            <div className="space-y-4">
              {data.addedRecords.map((rec, i) => (
                <DocumentCard
                  key={`added-${i}`}
                  badgeLabel={RECORD_TYPE_LABEL[rec.recordType] || "Record"}
                  title={rec.diagnosis || RECORD_TYPE_LABEL[rec.recordType] || "Record"}
                  subtitle={
                    [rec.sourceDoctorName, rec.sourceFacility].filter(Boolean).join(", ") ||
                    "Added by patient"
                  }
                  diagnosisCode={rec.diagnosisCode}
                  date={rec.date}
                  admissionDate={rec.admissionDate}
                  vitals={rec.vitals}
                  labResults={rec.labResults}
                  medicines={rec.medicines}
                  vaccineDetails={rec.vaccineDetails}
                  findings={rec.findings}
                  advice={rec.advice}
                  editedBadge={rec.wasEdited}
                  pageSnapshots={rec.pageSnapshots}
                  diagrams={rec.diagrams}
                />
              ))}

              {data.prescriptions.map((rx) => (
                <DocumentCard
                  key={rx.id}
                  badgeLabel="Prescription"
                  title={rx.diagnosis || "Prescription"}
                  subtitle={rx.doctorName}
                  date={rx.issuedAt}
                  medicines={rx.medicines}
                  advice={rx.advice}
                />
              ))}

              {data.consultNotes.map((note, i) => (
                <article key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="h-1.5 bg-primary" />
                  <div className="space-y-3 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Consultation note</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{note.doctorName}</p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {new Date(note.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {note.assessment ? (
                      <div className="rounded-xl border bg-background/40 p-3.5">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Assessment
                        </p>
                        <p className="text-sm">{note.assessment}</p>
                      </div>
                    ) : null}
                    {note.plan ? (
                      <div className="rounded-xl border bg-background/40 p-3.5">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Plan
                        </p>
                        <p className="text-sm">{note.plan}</p>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Shared read-only from MediFlow · not a substitute for the patient&apos;s full records
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/[0.05] to-transparent px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <FolderHeart className="h-4 w-4" />
          MediFlow Vault
        </div>

        {/* The one genuine "entry" moment on this public page — gets the
            gradient hero treatment Design.md scopes to result/status
            surfaces (same technique as the share code-ready screen). */}
        <div className="animate-in fade-in zoom-in-95 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-transparent p-8 text-center shadow-sm duration-500">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">View a shared health record</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the code the patient gave you. No account needed.
          </p>

          <div className="mt-6 space-y-1.5 text-left">
            <Label htmlFor="code">Share code</Label>
            <Input
              id="code"
              autoFocus
              autoCapitalize="characters"
              placeholder="e.g. 7K4M9QRT2WCJ8"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && redeem(code)}
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>
          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <Button
            className="mt-5 w-full"
            disabled={loading || !code.trim()}
            onClick={() => redeem(code)}
          >
            {loading ? "Checking…" : "View record"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          This link is controlled by the patient — it can be revoked at any time.
        </p>
      </div>
    </div>
  );
}

export default function VaultViewPage() {
  return (
    <Suspense fallback={null}>
      <VaultViewInner />
    </Suspense>
  );
}
