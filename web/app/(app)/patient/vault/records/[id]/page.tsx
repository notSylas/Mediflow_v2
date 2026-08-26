"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  FileText,
  History,
  Loader2,
  PenLine,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PatientPageShell } from "@/components/patient/PatientPortal";
import { cn } from "@/lib/utils";
import { TONES } from "@/lib/tones";

type RecordType = "prescription" | "lab" | "scan" | "discharge_summary" | "vaccination" | "other";
type ExtractionStatus = "stub" | "processing" | "synced" | "failed";
type LabResultFlag = "normal" | "high" | "low" | "critical";

const RECORD_TYPES: Array<{ label: string; value: RecordType }> = [
  { label: "Prescription", value: "prescription" },
  { label: "Lab report", value: "lab" },
  { label: "Scan", value: "scan" },
  { label: "Discharge summary", value: "discharge_summary" },
  { label: "Vaccination", value: "vaccination" },
  { label: "Other", value: "other" },
];

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  prescription: "Prescription",
  lab: "Lab report",
  scan: "Scan",
  discharge_summary: "Discharge summary",
  vaccination: "Vaccination",
  other: "Other",
};

const FLAG_OPTIONS: Array<{ label: string; value: LabResultFlag }> = [
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
  { label: "Critical", value: "critical" },
];

const FLAG_BADGE_CLASS: Record<LabResultFlag, string> = {
  normal: "border-transparent bg-muted text-muted-foreground",
  high: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-sky-300 bg-sky-50 text-sky-800",
  critical: "border-transparent bg-destructive/10 text-destructive",
};

const FIELD_LABELS: Record<string, string> = {
  recordType: "Type",
  recordDate: "Date",
  sourceFacility: "Hospital / clinic",
  sourceDoctorName: "Doctor",
  diagnosis: "Diagnosis",
  diagnosisCode: "Diagnosis code",
  advice: "Advice",
  medicines: "Medicines",
  vitals: "Vitals",
  labResults: "Lab results",
  findings: "Findings",
  admissionDate: "Admission date",
  vaccineDetails: "Vaccine details",
};

/** How long the review screen keeps polling before offering a manual retry instead. */
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 3000;

interface MedicineOut {
  name: string;
  strength: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string | null;
  durationDays: number | null;
  instructions: string | null;
}

interface Medicine {
  name: string;
  strength: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string;
  durationDaysText: string;
  instructions: string;
}

// Server shapes ("Out") vs form-state shapes (plain strings, parsed on save)
// — same convention as MedicineOut/Medicine above.
interface VitalsOut {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulseRate: number | null;
  temperatureCelsius: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
}

interface VitalsForm {
  bpSystolic: string;
  bpDiastolic: string;
  pulseRate: string;
  temperatureCelsius: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
}

interface LabResultOut {
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: LabResultFlag | null;
}

interface LabResultForm {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: LabResultFlag | null;
}

interface VaccineDetailsOut {
  vaccineName: string | null;
  doseNumber: string | null;
  batchNumber: string | null;
  route: string | null;
  site: string | null;
  nextDueDate: string | null;
}

interface VaccineDetailsForm {
  vaccineName: string;
  doseNumber: string;
  batchNumber: string;
  route: string;
  site: string;
  nextDueDate: string;
}

interface EditSummary {
  editedAt: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
}

interface VaultRecordPageSnapshot {
  id: string;
  pageIndex: number;
}

interface VaultRecordDiagram {
  id: string;
  pageIndex: number;
  confidence: number;
  width: number;
  height: number;
}

interface VaultRecord {
  id: string;
  recordType: RecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  diagnosisCode: string | null;
  advice: string | null;
  medicines: MedicineOut[];
  vitals: VitalsOut | null;
  labResults: LabResultOut[];
  findings: string | null;
  admissionDate: string | null;
  vaccineDetails: VaccineDetailsOut | null;
  extractionConfidence: "high" | "medium" | "low" | null;
  extractionStatus: ExtractionStatus;
  patientConfirmed: boolean;
  originalFilename: string;
  edits: EditSummary[];
  pageSnapshots: VaultRecordPageSnapshot[];
  diagrams: VaultRecordDiagram[];
}

function blankMedicine(): Medicine {
  return {
    name: "",
    strength: "",
    morning: false,
    afternoon: false,
    evening: false,
    night: false,
    foodRelation: "",
    durationDaysText: "",
    instructions: "",
  };
}

function blankVitals(): VitalsForm {
  return {
    bpSystolic: "",
    bpDiastolic: "",
    pulseRate: "",
    temperatureCelsius: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
  };
}

function blankLabResult(): LabResultForm {
  return { testName: "", value: "", unit: "", referenceRange: "", flag: null };
}

function blankVaccineDetails(): VaccineDetailsForm {
  return { vaccineName: "", doseNumber: "", batchNumber: "", route: "", site: "", nextDueDate: "" };
}

function numOrEmpty(n: number | null): string {
  return n == null ? "" : String(n);
}

function doseSummary(m: MedicineOut): string {
  const slots = (["morning", "afternoon", "evening", "night"] as const).filter((s) => m[s]);
  const parts = [
    m.strength,
    slots.length ? slots.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ") : null,
    m.durationDays ? `${m.durationDays} day${m.durationDays === 1 ? "" : "s"}` : null,
    m.foodRelation,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Non-empty chips for the entered vitals — also doubles as "is there anything to show/save". */
function vitalsChips(v: VitalsForm): string[] {
  const chips: string[] = [];
  if (v.bpSystolic.trim() || v.bpDiastolic.trim()) {
    chips.push(`BP ${v.bpSystolic.trim() || "—"}/${v.bpDiastolic.trim() || "—"} mmHg`);
  }
  if (v.pulseRate.trim()) chips.push(`Pulse ${v.pulseRate.trim()} bpm`);
  if (v.temperatureCelsius.trim()) chips.push(`Temp ${v.temperatureCelsius.trim()}°C`);
  if (v.spo2.trim()) chips.push(`SpO2 ${v.spo2.trim()}%`);
  if (v.weightKg.trim()) chips.push(`${v.weightKg.trim()} kg`);
  if (v.heightCm.trim()) chips.push(`${v.heightCm.trim()} cm`);
  return chips;
}

function formatPreviousValue(field: string, value: unknown): string {
  if (field === "recordType") {
    return RECORD_TYPE_LABELS[value as RecordType] ?? String(value ?? "—");
  }
  if (field === "medicines") {
    const meds = (value as MedicineOut[] | null) ?? [];
    return meds.length ? meds.map((m) => m.name).join(", ") : "(none)";
  }
  if (field === "labResults") {
    const results = (value as LabResultOut[] | null) ?? [];
    return results.length ? results.map((r) => r.testName).join(", ") : "(none)";
  }
  if (field === "vitals") {
    const v = value as VitalsOut | null;
    if (!v) return "(none)";
    const chips = vitalsChips({
      bpSystolic: numOrEmpty(v.bpSystolic),
      bpDiastolic: numOrEmpty(v.bpDiastolic),
      pulseRate: numOrEmpty(v.pulseRate),
      temperatureCelsius: numOrEmpty(v.temperatureCelsius),
      spo2: numOrEmpty(v.spo2),
      weightKg: numOrEmpty(v.weightKg),
      heightCm: numOrEmpty(v.heightCm),
    });
    return chips.length ? chips.join(", ") : "(none)";
  }
  if (field === "vaccineDetails") {
    const vd = value as VaccineDetailsOut | null;
    return vd?.vaccineName || "(none)";
  }
  return typeof value === "string" && value ? value : "(empty)";
}

export default function VaultRecordReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [lowConfidence, setLowConfidence] = useState(true);
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>("stub");
  const [pollElapsedMs, setPollElapsedMs] = useState(0);
  const [edits, setEdits] = useState<EditSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pageSnapshots, setPageSnapshots] = useState<VaultRecordPageSnapshot[]>([]);
  const [diagrams, setDiagrams] = useState<VaultRecordDiagram[]>([]);

  // "view" once the record is already confirmed, "edit" while it still needs
  // a first confirm. Independent of `wasAlreadyConfirmed`, which remembers
  // whether the record was confirmed *before this page load* — that decides
  // whether a successful save returns to view (re-editing something already
  // saved) or exits to the vault (finishing a fresh upload), see save() below.
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [wasAlreadyConfirmed, setWasAlreadyConfirmed] = useState(false);

  const [recordType, setRecordType] = useState<RecordType>("prescription");
  const [recordDate, setRecordDate] = useState("");
  const [sourceFacility, setSourceFacility] = useState("");
  const [sourceDoctorName, setSourceDoctorName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [advice, setAdvice] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([blankMedicine()]);
  const [vitals, setVitals] = useState<VitalsForm>(blankVitals());
  const [labResults, setLabResults] = useState<LabResultForm[]>([blankLabResult()]);
  const [findings, setFindings] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [vaccineDetails, setVaccineDetails] = useState<VaccineDetailsForm>(blankVaccineDetails());

  const applyRecord = (record: VaultRecord) => {
    setRecordType(record.recordType);
    setRecordDate(record.recordDate ?? "");
    setSourceFacility(record.sourceFacility ?? "");
    setSourceDoctorName(record.sourceDoctorName ?? "");
    setDiagnosis(record.diagnosis ?? "");
    setDiagnosisCode(record.diagnosisCode ?? "");
    setAdvice(record.advice ?? "");
    setLowConfidence(!record.extractionConfidence || record.extractionConfidence === "low");
    setExtractionStatus(record.extractionStatus);
    setEdits(record.edits ?? []);
    setPageSnapshots(record.pageSnapshots ?? []);
    setDiagrams(record.diagrams ?? []);
    setFindings(record.findings ?? "");
    setAdmissionDate(record.admissionDate ?? "");
    setVitals(
      record.vitals
        ? {
            bpSystolic: numOrEmpty(record.vitals.bpSystolic),
            bpDiastolic: numOrEmpty(record.vitals.bpDiastolic),
            pulseRate: numOrEmpty(record.vitals.pulseRate),
            temperatureCelsius: numOrEmpty(record.vitals.temperatureCelsius),
            spo2: numOrEmpty(record.vitals.spo2),
            weightKg: numOrEmpty(record.vitals.weightKg),
            heightCm: numOrEmpty(record.vitals.heightCm),
          }
        : blankVitals()
    );
    setLabResults(
      record.labResults.length
        ? record.labResults.map((r) => ({
            testName: r.testName,
            value: r.value,
            unit: r.unit ?? "",
            referenceRange: r.referenceRange ?? "",
            flag: r.flag,
          }))
        : [blankLabResult()]
    );
    setVaccineDetails(
      record.vaccineDetails
        ? {
            vaccineName: record.vaccineDetails.vaccineName ?? "",
            doseNumber: record.vaccineDetails.doseNumber ?? "",
            batchNumber: record.vaccineDetails.batchNumber ?? "",
            route: record.vaccineDetails.route ?? "",
            site: record.vaccineDetails.site ?? "",
            nextDueDate: record.vaccineDetails.nextDueDate ?? "",
          }
        : blankVaccineDetails()
    );
    if (record.medicines.length) {
      setMedicines(
        record.medicines.map((m) => ({
          name: m.name,
          strength: m.strength ?? "",
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation ?? "",
          durationDaysText: m.durationDays ? String(m.durationDays) : "",
          instructions: m.instructions ?? "",
        }))
      );
    }
    return record;
  };

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/v1/patient/vault/records/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json?.error ?? "Couldn't load this record.");
        setLoading(false);
        return;
      }
      const record = applyRecord(json.record as VaultRecord);
      setWasAlreadyConfirmed(record.patientConfirmed);
      setMode(record.patientConfirmed ? "view" : "edit");
      setLoading(false);
    })();
  }, [id]);

  // While a background analysis is still running, poll for the write-back —
  // capped so an unconfigured/stuck analyzer doesn't spin forever.
  useEffect(() => {
    if (extractionStatus !== "processing") return;
    if (pollElapsedMs >= POLL_TIMEOUT_MS) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/patient/vault/records/${id}`);
        if (res.ok) {
          const json = await res.json();
          applyRecord(json.record as VaultRecord);
        }
      } catch {
        // Transient network blip; the next tick retries.
      }
      setPollElapsedMs((ms) => ms + POLL_INTERVAL_MS);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [extractionStatus, pollElapsedMs, id]);

  const checkAgain = async () => {
    setPollElapsedMs(0);
    const res = await fetch(`/api/v1/patient/vault/records/${id}`);
    if (res.ok) {
      const json = await res.json();
      applyRecord(json.record as VaultRecord);
    }
  };

  const updateMedicine = (index: number, patch: Partial<Medicine>) =>
    setMedicines((current) => current.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const updateLabResult = (index: number, patch: Partial<LabResultForm>) =>
    setLabResults((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const namedLabResults = labResults.filter((r) => r.testName.trim());
  const hasVaccineName = Boolean(vaccineDetails.vaccineName.trim());

  // Mirrors backend/vault/vault-validation.ts — same baseline for every record,
  // checked here too so the patient sees what's missing before submitting.
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!recordDate.trim()) errors.push("Add the date on the document.");
    if (!sourceFacility.trim() && !sourceDoctorName.trim()) {
      errors.push("Add the hospital/clinic or the doctor's name.");
    }
    const namedMedicines = medicines.filter((m) => m.name.trim());
    const hasTypeSpecificContent =
      (recordType === "lab" && namedLabResults.length > 0) ||
      (recordType === "vaccination" && hasVaccineName) ||
      (["scan", "discharge_summary", "other"].includes(recordType) && findings.trim().length > 0);
    if (
      !diagnosis.trim() &&
      !advice.trim() &&
      namedMedicines.length === 0 &&
      !hasTypeSpecificContent
    ) {
      errors.push("Add a diagnosis, advice, or at least one medicine.");
    }
    if (medicines.some((m) => m.name.trim() === "" && Object.values(m).some((v) => v !== "" && v !== false))) {
      errors.push("Every medicine needs a name.");
    }
    return errors;
  }, [
    recordDate,
    sourceFacility,
    sourceDoctorName,
    diagnosis,
    advice,
    medicines,
    recordType,
    namedLabResults.length,
    hasVaccineName,
    findings,
  ]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setServerErrors([]);
    try {
      const chips = vitalsChips(vitals);
      const parseNum = (s: string) => (s.trim() ? Number(s.trim()) : null);
      const res = await fetch(`/api/v1/patient/vault/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType,
          recordDate: recordDate.trim() || null,
          sourceFacility: sourceFacility.trim() || null,
          sourceDoctorName: sourceDoctorName.trim() || null,
          diagnosis: diagnosis.trim() || null,
          diagnosisCode: diagnosisCode.trim() || null,
          advice: advice.trim() || null,
          medicines: medicines
            .filter((m) => m.name.trim())
            .map((m) => ({
              name: m.name.trim(),
              strength: m.strength.trim() || null,
              route: null,
              morning: m.morning,
              afternoon: m.afternoon,
              evening: m.evening,
              night: m.night,
              foodRelation: m.foodRelation.trim() || null,
              instructions: m.instructions.trim() || null,
              durationDays: m.durationDaysText ? Number(m.durationDaysText) : null,
            })),
          vitals: chips.length
            ? {
                bpSystolic: parseNum(vitals.bpSystolic),
                bpDiastolic: parseNum(vitals.bpDiastolic),
                pulseRate: parseNum(vitals.pulseRate),
                temperatureCelsius: parseNum(vitals.temperatureCelsius),
                spo2: parseNum(vitals.spo2),
                weightKg: parseNum(vitals.weightKg),
                heightCm: parseNum(vitals.heightCm),
              }
            : null,
          labResults: namedLabResults.map((r) => ({
            testName: r.testName.trim(),
            value: r.value.trim(),
            unit: r.unit.trim() || null,
            referenceRange: r.referenceRange.trim() || null,
            flag: r.flag,
          })),
          findings: findings.trim() || null,
          admissionDate: admissionDate.trim() || null,
          vaccineDetails: hasVaccineName
            ? {
                vaccineName: vaccineDetails.vaccineName.trim() || null,
                doseNumber: vaccineDetails.doseNumber.trim() || null,
                batchNumber: vaccineDetails.batchNumber.trim() || null,
                route: vaccineDetails.route.trim() || null,
                site: vaccineDetails.site.trim() || null,
                nextDueDate: vaccineDetails.nextDueDate.trim() || null,
              }
            : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (Array.isArray(json?.errors)) {
          setServerErrors(json.errors);
          return;
        }
        throw new Error(typeof json?.error === "string" ? json.error : "Couldn't save");
      }
      applyRecord(json.record as VaultRecord);
      if (wasAlreadyConfirmed) {
        // Re-editing something already saved — stay here, show the update.
        setMode("view");
      } else {
        // First-ever confirm — done, back to the vault.
        router.push("/patient/vault");
      }
      setWasAlreadyConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    const message = wasAlreadyConfirmed
      ? "Delete this record? This can't be undone."
      : "Discard this upload? The photo and anything you've entered will be deleted.";
    if (!confirm(message)) return;
    await fetch(`/api/v1/patient/vault/records/${id}`, { method: "DELETE" });
    router.push("/patient/vault");
  };

  if (loading) {
    return (
      <PatientPageShell className="max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PatientPageShell>
    );
  }

  if (loadError) {
    return (
      <PatientPageShell className="max-w-2xl">
        <p className="text-sm text-destructive">{loadError}</p>
      </PatientPageShell>
    );
  }

  if (mode === "view") {
    const namedMedicines = medicines.filter((m) => m.name.trim());
    const chips = vitalsChips(vitals);
    const shownLabResults = labResults.filter((r) => r.testName.trim());
    const hasFindings = findings.trim().length > 0;
    const hasVaccine = Boolean(vaccineDetails.vaccineName.trim());
    return (
      <PatientPageShell className="max-w-2xl">
        <Link
          href="/patient/vault"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vault
        </Link>

        {/* Document card: a letterhead-style header + tabular medicines,
            borrowing PrescriptionDocument's structural language (not its
            print-branded teal) so a vault record reads like a real record,
            not a form echo. Flat per Design.md's forms/dense-content rule —
            no glass/blur. */}
        <article className="overflow-hidden rounded-2xl border bg-card">
          <div className="h-1.5 bg-primary" />
          <div className="p-6 sm:p-8">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  {RECORD_TYPE_LABELS[recordType]}
                </Badge>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {diagnosis || RECORD_TYPE_LABELS[recordType]}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[sourceDoctorName, sourceFacility].filter(Boolean).join(" · ") || "Added by you"}
                  {diagnosisCode ? ` · ${diagnosisCode}` : ""}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 px-4 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {recordType === "discharge_summary" ? "Discharge date" : "Date"}
                </p>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {recordDate ? new Date(recordDate).toLocaleDateString() : "Not recorded"}
                </p>
                {recordType === "discharge_summary" && admissionDate ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Admitted {new Date(admissionDate).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            </header>

            {chips.length > 0 ? (
              <section className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <section className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lab results
                </p>
                <div className="overflow-hidden rounded-xl border">
                  {shownLabResults.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 border-b p-3.5 text-sm last:border-b-0 odd:bg-background/40"
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

            {namedMedicines.length > 0 ? (
              <section className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Medicines
                </p>
                <div className="overflow-hidden rounded-xl border">
                  {namedMedicines.map((m, i) => {
                    const summary = doseSummary({
                      ...m,
                      strength: m.strength || null,
                      durationDays: m.durationDaysText ? Number(m.durationDaysText) : null,
                      foodRelation: m.foodRelation || null,
                      instructions: m.instructions || null,
                    });
                    return (
                      <div
                        key={i}
                        className="flex gap-3 border-b p-3.5 text-sm last:border-b-0 odd:bg-background/40"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{m.name}</p>
                          {summary && <p className="text-muted-foreground">{summary}</p>}
                          {m.instructions && (
                            <p className="text-muted-foreground">{m.instructions}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {hasVaccine ? (
              <section className="mt-6 rounded-xl border bg-background/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vaccine details
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  {[
                    ["Vaccine", vaccineDetails.vaccineName],
                    ["Dose", vaccineDetails.doseNumber],
                    ["Batch", vaccineDetails.batchNumber],
                    ["Route", vaccineDetails.route],
                    ["Site", vaccineDetails.site],
                    [
                      "Next due",
                      vaccineDetails.nextDueDate
                        ? new Date(vaccineDetails.nextDueDate).toLocaleDateString()
                        : "",
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

            {hasFindings ? (
              <section className="mt-6 rounded-xl border bg-background/40 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Findings
                </p>
                <p className="text-sm">{findings}</p>
              </section>
            ) : null}

            {advice ? (
              <section className="mt-6 rounded-xl border bg-background/40 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Advice
                </p>
                <p className="text-sm">{advice}</p>
              </section>
            ) : null}

            {!diagnosis &&
            namedMedicines.length === 0 &&
            !advice &&
            chips.length === 0 &&
            shownLabResults.length === 0 &&
            !hasVaccine &&
            !hasFindings ? (
              <p className="mt-6 text-sm text-muted-foreground">No additional details recorded.</p>
            ) : null}

            {pageSnapshots.length > 0 && (
              <section className="mt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      TONES.blue.chip
                    )}
                  >
                    <FileText className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    Original page{pageSnapshots.length > 1 ? "s" : ""}
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pageSnapshots.map((p) => (
                    <figure
                      key={p.id}
                      className={cn("overflow-hidden rounded-xl p-3", TONES.blue.tile)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/v1/prescription-page-snapshots/${p.id}`}
                        alt={`Page ${p.pageIndex + 1} of the uploaded document`}
                        className="w-full rounded-lg bg-white object-contain"
                        loading="lazy"
                      />
                      <figcaption className="mt-2 text-xs text-foreground/60">
                        Page {p.pageIndex + 1}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {diagrams.length > 0 && (
              <section className="mt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      TONES.violet.chip
                    )}
                  >
                    <PenLine className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    Doctor&apos;s drawing{diagrams.length > 1 ? "s" : ""}
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {diagrams.map((d) => (
                    <figure
                      key={d.id}
                      className={cn("overflow-hidden rounded-xl p-3", TONES.violet.tile)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/v1/prescription-diagrams/${d.id}`}
                        alt={`Hand-drawn diagram from page ${d.pageIndex + 1}`}
                        className="w-full rounded-lg bg-white object-contain"
                        loading="lazy"
                      />
                      <figcaption className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                        <span>Page {d.pageIndex + 1}</span>
                        <span className="font-mono tabular-nums">{d.confidence}% match</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* Provenance stamp — quiet by design, this is metadata about the
                record, not the record's own content. */}
            <footer className="mt-8 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <History className="h-3 w-3" />
                  {edits.length === 0
                    ? "Confirmed by you — never edited"
                    : `Confirmed by you · edited ${edits.length} time${edits.length === 1 ? "" : "s"}`}
                </span>
                {edits.length > 0 && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`}
                  />
                )}
              </button>
              {showHistory && edits.length > 0 && (
                <ul className="mt-3 space-y-3 border-t pt-3">
                  {edits.map((edit, i) => (
                    <li key={i} className="text-xs">
                      <p className="font-medium text-foreground">
                        Edit {i + 1} · {new Date(edit.editedAt).toLocaleString()}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {edit.changedFields.map((field) => (
                          <li key={field}>
                            {FIELD_LABELS[field] ?? field} was:{" "}
                            {formatPreviousValue(field, edit.previousValues[field])}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </footer>
          </div>
        </article>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setMode("edit")}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button type="button" variant="outline" onClick={discard}>
            Delete this record
          </Button>
        </div>
      </PatientPageShell>
    );
  }

  return (
    <PatientPageShell className="max-w-2xl">
      <div>
        {wasAlreadyConfirmed ? (
          <button
            type="button"
            onClick={() => setMode("view")}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cancel
          </button>
        ) : (
          <Link
            href="/patient/vault"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Vault
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {wasAlreadyConfirmed ? "Edit record" : "Review before saving"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {wasAlreadyConfirmed
            ? "Changes are recorded — what you had before stays visible in the record's history."
            : "Confirm what's on the document."}
        </p>
      </div>

      {extractionStatus === "processing" ? (
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
            <div>
              <p>Reading your document… this can take up to a minute.</p>
              {pollElapsedMs >= POLL_TIMEOUT_MS ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-muted-foreground">
                    Still not back — you can fill it in yourself, or check again.
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={checkAgain}>
                    Check again
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : lowConfidence && !wasAlreadyConfirmed ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p>
              We couldn&apos;t read this document automatically — fill in the details below yourself.
              Nothing is saved until you confirm.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Type of record</Label>
            <div className="flex flex-wrap gap-2">
              {RECORD_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={recordType === t.value ? "default" : "outline"}
                  onClick={() => setRecordType(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                {recordType === "discharge_summary" ? "Discharge date" : "Date on the document"}
              </Label>
              <Input id="date" type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facility">Hospital / clinic</Label>
              <Input
                id="facility"
                value={sourceFacility}
                onChange={(e) => setSourceFacility(e.target.value)}
                placeholder="e.g. Apollo Clinic, Koramangala"
              />
            </div>
          </div>
          {recordType === "discharge_summary" ? (
            <div className="space-y-1.5">
              <Label htmlFor="admissionDate">Admission date</Label>
              <Input
                id="admissionDate"
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doctor&apos;s name</Label>
            <Input
              id="doctor"
              value={sourceDoctorName}
              onChange={(e) => setSourceDoctorName(e.target.value)}
              placeholder="Optional if hospital/clinic is filled in"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="What the document says was diagnosed"
              />
            </div>
            <div className="space-y-1.5 sm:w-40">
              <Label htmlFor="diagnosisCode">Diagnosis code</Label>
              <Input
                id="diagnosisCode"
                value={diagnosisCode}
                onChange={(e) => setDiagnosisCode(e.target.value)}
                placeholder="e.g. ICD-10 (optional)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {recordType === "prescription" || recordType === "discharge_summary" ? (
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="font-semibold">Vitals</h2>
              <p className="text-xs text-muted-foreground">Optional — leave blank if not recorded.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="BP systolic"
                  inputMode="numeric"
                  value={vitals.bpSystolic}
                  onChange={(e) => setVitals((v) => ({ ...v, bpSystolic: e.target.value }))}
                />
                <Input
                  placeholder="BP diastolic"
                  inputMode="numeric"
                  value={vitals.bpDiastolic}
                  onChange={(e) => setVitals((v) => ({ ...v, bpDiastolic: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Pulse (bpm)"
                inputMode="numeric"
                value={vitals.pulseRate}
                onChange={(e) => setVitals((v) => ({ ...v, pulseRate: e.target.value }))}
              />
              <Input
                placeholder="Temperature (°C)"
                inputMode="decimal"
                value={vitals.temperatureCelsius}
                onChange={(e) => setVitals((v) => ({ ...v, temperatureCelsius: e.target.value }))}
              />
              <Input
                placeholder="SpO2 (%)"
                inputMode="numeric"
                value={vitals.spo2}
                onChange={(e) => setVitals((v) => ({ ...v, spo2: e.target.value }))}
              />
              <Input
                placeholder="Weight (kg)"
                inputMode="decimal"
                value={vitals.weightKg}
                onChange={(e) => setVitals((v) => ({ ...v, weightKg: e.target.value }))}
              />
              <Input
                placeholder="Height (cm)"
                inputMode="decimal"
                value={vitals.heightCm}
                onChange={(e) => setVitals((v) => ({ ...v, heightCm: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {recordType === "lab" ? (
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <h2 className="font-semibold">Lab results</h2>
            {labResults.map((result, index) => (
              <div key={index} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Test {index + 1}</p>
                  {labResults.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLabResults((c) => c.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                <Input
                  placeholder="Test name, e.g. Hemoglobin"
                  value={result.testName}
                  onChange={(e) => updateLabResult(index, { testName: e.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Value"
                    value={result.value}
                    onChange={(e) => updateLabResult(index, { value: e.target.value })}
                  />
                  <Input
                    placeholder="Unit, e.g. g/dL"
                    value={result.unit}
                    onChange={(e) => updateLabResult(index, { unit: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Reference range, e.g. 13.0–17.0"
                  value={result.referenceRange}
                  onChange={(e) => updateLabResult(index, { referenceRange: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  {FLAG_OPTIONS.map((f) => (
                    <Button
                      key={f.value}
                      type="button"
                      size="sm"
                      variant={result.flag === f.value ? "default" : "outline"}
                      onClick={() =>
                        updateLabResult(index, { flag: result.flag === f.value ? null : f.value })
                      }
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <Separator />
            <Button
              type="button"
              variant="outline"
              onClick={() => setLabResults((c) => [...c, blankLabResult()])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another test
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {recordType === "vaccination" ? (
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <h2 className="font-semibold">Vaccine details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Vaccine name"
                value={vaccineDetails.vaccineName}
                onChange={(e) => setVaccineDetails((v) => ({ ...v, vaccineName: e.target.value }))}
              />
              <Input
                placeholder="Dose number, e.g. 2 of 2"
                value={vaccineDetails.doseNumber}
                onChange={(e) => setVaccineDetails((v) => ({ ...v, doseNumber: e.target.value }))}
              />
              <Input
                placeholder="Batch / lot number"
                value={vaccineDetails.batchNumber}
                onChange={(e) => setVaccineDetails((v) => ({ ...v, batchNumber: e.target.value }))}
              />
              <Input
                placeholder="Route, e.g. Intramuscular"
                value={vaccineDetails.route}
                onChange={(e) => setVaccineDetails((v) => ({ ...v, route: e.target.value }))}
              />
              <Input
                placeholder="Site, e.g. Left arm"
                value={vaccineDetails.site}
                onChange={(e) => setVaccineDetails((v) => ({ ...v, site: e.target.value }))}
              />
              <div className="space-y-1.5">
                <Label htmlFor="nextDueDate" className="sr-only">
                  Next dose due
                </Label>
                <Input
                  id="nextDueDate"
                  type="date"
                  placeholder="Next dose due"
                  value={vaccineDetails.nextDueDate}
                  onChange={(e) => setVaccineDetails((v) => ({ ...v, nextDueDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-semibold">Medicines</h2>
          {medicines.map((medicine, index) => (
            <div key={index} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Medicine {index + 1}</p>
                {medicines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMedicines((c) => c.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Medicine name"
                  value={medicine.name}
                  onChange={(e) => updateMedicine(index, { name: e.target.value })}
                />
                <Input
                  placeholder="Strength, e.g. 500 mg"
                  value={medicine.strength}
                  onChange={(e) => updateMedicine(index, { strength: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["morning", "afternoon", "evening", "night"] as const).map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    size="sm"
                    variant={medicine[slot] ? "default" : "outline"}
                    onClick={() => updateMedicine(index, { [slot]: !medicine[slot] })}
                  >
                    {slot[0].toUpperCase() + slot.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Food relation, e.g. After food"
                  value={medicine.foodRelation}
                  onChange={(e) => updateMedicine(index, { foodRelation: e.target.value })}
                />
                <Input
                  placeholder="Duration in days"
                  inputMode="numeric"
                  value={medicine.durationDaysText}
                  onChange={(e) => updateMedicine(index, { durationDaysText: e.target.value })}
                />
              </div>
              <Input
                placeholder="Instructions (optional)"
                value={medicine.instructions}
                onChange={(e) => updateMedicine(index, { instructions: e.target.value })}
              />
            </div>
          ))}
          <Separator />
          <Button
            type="button"
            variant="outline"
            onClick={() => setMedicines((c) => [...c, blankMedicine()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add another medicine
          </Button>
        </CardContent>
      </Card>

      {["lab", "scan", "discharge_summary", "other"].includes(recordType) ? (
        <Card className="rounded-2xl">
          <CardContent className="space-y-1.5 p-6">
            <Label htmlFor="findings">
              {recordType === "discharge_summary" ? "Course in hospital" : "Findings"}
            </Label>
            <Textarea
              id="findings"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="What the document reports"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardContent className="space-y-1.5 p-6">
          <Label htmlFor="advice">Doctor&apos;s advice</Label>
          <Textarea id="advice" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Optional" />
        </CardContent>
      </Card>

      {(validationErrors.length > 0 || serverErrors.length > 0) && (
        <ul className="space-y-1 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-sm text-amber-950">
          {(serverErrors.length > 0 ? serverErrors : validationErrors).map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={saving || validationErrors.length > 0} onClick={save}>
          {saving ? "Saving…" : wasAlreadyConfirmed ? "Save changes" : "Save to vault"}
        </Button>
        {wasAlreadyConfirmed ? (
          <Button type="button" variant="ghost" onClick={() => setMode("view")}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={discard}>
          {wasAlreadyConfirmed ? "Delete this record" : "Discard"}
        </Button>
      </div>
    </PatientPageShell>
  );
}
