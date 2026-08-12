export interface VaultTimelineItem {
  id: string;
  type: "prescription" | "consult_note" | "added_record";
  date: string;
  doctorName: string;
  summary: string;
  source: "mediflow" | "added";
}

export type VaultRecordType =
  | "prescription"
  | "lab"
  | "scan"
  | "discharge_summary"
  | "vaccination"
  | "other";

export const VAULT_RECORD_TYPE_OPTIONS: Array<{ label: string; value: VaultRecordType }> = [
  { label: "Prescription", value: "prescription" },
  { label: "Lab report", value: "lab" },
  { label: "Scan", value: "scan" },
  { label: "Discharge summary", value: "discharge_summary" },
  { label: "Vaccination", value: "vaccination" },
  { label: "Other", value: "other" },
];

export interface VaultRecordMedicine {
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

export interface VaultRecordDTO {
  id: string;
  recordType: VaultRecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  advice: string | null;
  medicines: VaultRecordMedicine[];
  extractionConfidence: "high" | "medium" | "low" | null;
  patientConfirmed: boolean;
  originalFilename: string;
  createdAt: string;
}

export type VaultShareScope = "everything" | "last_6_months";

export const VAULT_SHARE_SCOPE_OPTIONS: Array<{ label: string; value: VaultShareScope }> = [
  { label: "Everything", value: "everything" },
  { label: "Last 6 months", value: "last_6_months" },
];

// Values are minutes, kept as strings for ChoiceChips (which is string-valued) —
// parsed back to a number at submit time. Must match ALLOWED_DURATION_MINUTES
// in src/lib/vault/vault-share-policy.ts.
export const VAULT_SHARE_DURATION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "2 hours", value: "120" },
  { label: "24 hours", value: "1440" },
  { label: "7 days", value: "10080" },
];

export type VaultShareStatus = "active" | "expired" | "revoked";

export interface VaultShareSummary {
  id: string;
  status: VaultShareStatus;
  scope: { from: string | null; to: string };
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
}
