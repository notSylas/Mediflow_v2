export interface VaultTimelineItem {
  id: string;
  type: "prescription" | "consult_note" | "added_record";
  date: string;
  doctorName: string;
  summary: string;
  source: "mediflow" | "added";
  appointmentId: string | null;
  recordType: string | null;
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

export type VaultRecordExtractionStatus = "stub" | "processing" | "synced" | "failed";

export interface VaultRecordEditSummary {
  editedAt: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
}

// FHIR/ABDM-aligned generic fields — see docs/designs/vault-share-trd.md's
// field-mapping table. All optional; type-specific by convention only.
export interface VaultRecordVitals {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulseRate: number | null;
  temperatureCelsius: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
}

export type VaultLabResultFlag = "normal" | "high" | "low" | "critical";

export interface VaultLabResult {
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: VaultLabResultFlag | null;
}

export interface VaultVaccineDetails {
  vaccineName: string | null;
  doseNumber: string | null;
  batchNumber: string | null;
  route: string | null;
  site: string | null;
  nextDueDate: string | null;
}

export interface VaultRecordDTO {
  id: string;
  recordType: VaultRecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  diagnosisCode: string | null;
  advice: string | null;
  medicines: VaultRecordMedicine[];
  vitals: VaultRecordVitals | null;
  labResults: VaultLabResult[];
  findings: string | null;
  admissionDate: string | null;
  vaccineDetails: VaultVaccineDetails | null;
  extractionConfidence: "high" | "medium" | "low" | null;
  extractionStatus: VaultRecordExtractionStatus;
  patientConfirmed: boolean;
  originalFilename: string;
  createdAt: string;
  edits: VaultRecordEditSummary[];
}

export interface VaultDoctorConsent {
  eligible: boolean;
  consented: boolean;
  consentedAt: string | null;
}

export type VaultShareScope = "everything" | "last_6_months";

export const VAULT_SHARE_SCOPE_OPTIONS: Array<{ label: string; value: VaultShareScope }> = [
  { label: "Everything", value: "everything" },
  { label: "Last 6 months", value: "last_6_months" },
];

export type VaultShareStatus = "active" | "revoked";

export interface VaultShareSummary {
  id: string;
  status: VaultShareStatus;
  scope: { from: string | null; to: string };
  createdAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
}
