// Turns an uploaded photo/PDF into structured fields for Tier 2 of the vault
// (docs/designs/vault-share-prd.md §7.2 / TRD §6). No provider is chosen yet
// — this is a deliberate stub, not a placeholder left by accident.
//
// It always returns low confidence with empty fields, which correctly drives
// the review screen into its "we couldn't read this clearly — fill it in
// yourself" path. That path has to exist regardless of which extraction
// provider gets picked later (medical data is never auto-trusted from an
// extraction pass — PRD §6.2), so nothing here is faked or assumed; the stub
// just always takes the branch a real provider would sometimes take anyway.
//
// Swap the body of extractRecordFields() for a real provider call when one
// is chosen. The signature is shaped so nothing else has to change: callers
// already handle "low confidence, mostly empty" as a normal, valid result.

export interface ExtractedMedicine {
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

export type VaultRecordType =
  | "prescription"
  | "lab"
  | "scan"
  | "discharge_summary"
  | "vaccination"
  | "other";

export interface ExtractedRecordFields {
  confidence: "high" | "medium" | "low";
  recordType: VaultRecordType | null;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  advice: string | null;
  medicines: ExtractedMedicine[];
}

export function isExtractionConfigured(): boolean {
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function extractRecordFields(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedRecordFields> {
  return {
    confidence: "low",
    recordType: null,
    recordDate: null,
    sourceFacility: null,
    sourceDoctorName: null,
    diagnosis: null,
    advice: null,
    medicines: [],
  };
}

/**
 * Maps the Prescription Analyzer's output onto the vault's extraction shape.
 *
 * The analyzer runs as a Cloud Run Job (20-60s), far too slow to await inside
 * a vault upload — so `extractRecordFields` above still returns immediately
 * with low confidence, and the record is upgraded later once the job lands.
 * That is deliberately the same "couldn't read this clearly" path the review
 * screen already handles, so nothing downstream changes.
 *
 * Confidence is bucketed rather than passed through: the vault's review screen
 * reasons in high/medium/low, and medical data is never auto-trusted from an
 * extraction pass (PRD §6.2) — a 0.9 still lands the patient on a review step.
 */
export function analyzedPrescriptionToRecordFields(
  result: AnalyzedPrescriptionLike
): ExtractedRecordFields {
  const overall = result.overall_confidence ?? 0;
  const confidence: ExtractedRecordFields["confidence"] =
    overall >= 0.8 ? "high" : overall >= 0.5 ? "medium" : "low";

  return {
    confidence,
    // The analyzer only ever reads prescriptions; other vault record types
    // stay unclassified rather than being guessed at.
    recordType: result.medications?.length ? "prescription" : null,
    recordDate: parseRecordDate(result.patient?.date),
    sourceFacility: result.doctor?.clinic_or_hospital ?? null,
    sourceDoctorName: result.doctor?.name ?? null,
    diagnosis: result.diagnosis?.length ? result.diagnosis.join("; ") : null,
    advice: result.advice?.length ? result.advice.join("; ") : null,
    medicines: (result.medications ?? []).map((m) => ({
      name: m.name ?? m.raw_text ?? "Unreadable",
      strength: m.strength ?? null,
      route: m.route ?? null,
      // The analyzer normalises to prose ("twice daily"); the vault stores the
      // four slots the prescription composer uses. Anything we can't map
      // confidently leaves all four false, which the review screen shows as
      // "no schedule read" rather than inventing one.
      ...slotsFromFrequency(m.frequency_raw, m.frequency),
      foodRelation: m.instructions ?? null,
      durationDays: parseDurationDays(m.duration),
      instructions: m.instructions ?? null,
    })),
  };
}

/** Minimal structural view of the analyzer payload (see backend/prescriptions/analysis.ts). */
export interface AnalyzedPrescriptionLike {
  doctor?: { name?: string | null; clinic_or_hospital?: string | null };
  patient?: { date?: string | null };
  diagnosis?: string[];
  advice?: string[];
  medications?: {
    raw_text?: string | null;
    name?: string | null;
    strength?: string | null;
    route?: string | null;
    frequency?: string | null;
    frequency_raw?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }[];
  overall_confidence?: number;
}

/**
 * Indian prescription shorthand → the vault's four dosing slots.
 * "1-0-1" is morning-afternoon-night positional; BD/TDS/QID/HS/OD are the
 * common abbreviations. Anything unrecognised leaves every slot false.
 */
function slotsFromFrequency(raw?: string | null, normalized?: string | null) {
  const off = { morning: false, afternoon: false, evening: false, night: false };
  const text = (raw ?? normalized ?? "").trim().toLowerCase();
  if (!text) return off;

  const positional = text.match(/^(\d)\s*-\s*(\d)\s*-\s*(\d)(?:\s*-\s*(\d))?$/);
  if (positional) {
    const [, a, b, c, d] = positional;
    return d !== undefined
      ? {
          morning: a !== "0",
          afternoon: b !== "0",
          evening: c !== "0",
          night: d !== "0",
        }
      : { morning: a !== "0", afternoon: b !== "0", evening: false, night: c !== "0" };
  }

  if (/\bhs\b|bedtime|at night/.test(text)) return { ...off, night: true };
  if (/\bod\b|once daily/.test(text)) return { ...off, morning: true };
  if (/\bbd\b|\bbid\b|twice/.test(text)) return { ...off, morning: true, night: true };
  if (/\btds\b|\btid\b|three times/.test(text))
    return { morning: true, afternoon: true, evening: false, night: true };
  if (/\bqid\b|four times/.test(text))
    return { morning: true, afternoon: true, evening: true, night: true };

  return off;
}

/**
 * Best-effort parse of whatever date format the model read off the document
 * into YYYY-MM-DD for Postgres's `date` column — the prompt never dictates a
 * format, so this comes back as ISO, DD-MM-YYYY, DD/MM/YYYY (the common
 * Indian prescription format), etc. An unparseable or ambiguous date is
 * dropped (null) rather than risk silently swapping day and month.
 */
function parseRecordDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const day = Number(d);
    const month = Number(m);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  return null;
}

/** "5 days" -> 5, "2 weeks" -> 14. Null when it isn't a plain duration. */
function parseDurationDays(duration?: string | null): number | null {
  if (!duration) return null;
  const m = duration.trim().toLowerCase().match(/^(\d+)\s*(day|days|week|weeks|month|months)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (m[2].startsWith("week")) return n * 7;
  if (m[2].startsWith("month")) return n * 30;
  return n;
}
