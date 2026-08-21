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
