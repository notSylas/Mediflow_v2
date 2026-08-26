import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "~backend/db";
import { vaultRecordEdits, vaultRecords } from "~backend/db/schema";
import {
  createAnalysis,
  getAnalysisByVaultRecordId,
  getAnalysisWithDataForUploader,
  linkAnalysisToVaultRecord,
  listDiagramsForVaultRecord,
  listPageSnapshotsForVaultRecord,
} from "~backend/prescriptions/analysis";
import { analyzerAvailable, runAnalysisJob } from "~backend/prescriptions/job-runner";
import {
  analyzedPrescriptionToRecordFields,
  extractRecordFields,
  type AnalyzedPrescriptionLike,
  type ExtractedMedicine,
  type VaultRecordType,
} from "./vault-extraction";
import { validateVaultRecordPatch } from "./vault-validation";

export interface VaultRecordEditSummary {
  editedAt: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
}

// FHIR/ABDM-aligned generic fields — see docs/designs/vault-share-trd.md's
// field-mapping table. All optional; type-specific by convention only
// (enforced at the UI/validation layer, not the DB).
export interface VitalsData {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulseRate: number | null;
  temperatureCelsius: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
}

export type LabResultFlag = "normal" | "high" | "low" | "critical";

export interface LabResultEntry {
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: LabResultFlag | null;
}

export interface VaccineDetailsData {
  vaccineName: string | null;
  doseNumber: string | null;
  batchNumber: string | null;
  route: string | null;
  site: string | null;
  nextDueDate: string | null;
}

export interface VaultRecordDiagramDTO {
  id: string;
  pageIndex: number;
  confidence: number;
  width: number;
  height: number;
}

export interface VaultRecordPageSnapshotDTO {
  id: string;
  pageIndex: number;
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
  medicines: ExtractedMedicine[];
  vitals: VitalsData | null;
  labResults: LabResultEntry[];
  findings: string | null;
  admissionDate: string | null;
  vaccineDetails: VaccineDetailsData | null;
  extractionConfidence: "high" | "medium" | "low" | null;
  extractionStatus: "stub" | "processing" | "synced" | "failed";
  patientConfirmed: boolean;
  originalFilename: string;
  createdAt: string;
  /** Oldest-first. Empty until the patient has saved at least once. */
  edits: VaultRecordEditSummary[];
  /** Whole rendered pages of the uploaded file — how the patient sees what they uploaded. */
  pageSnapshots: VaultRecordPageSnapshotDTO[];
  /** Hand-drawn diagrams detected on the uploaded file, if any. */
  diagrams: VaultRecordDiagramDTO[];
}

function toDTO(
  row: typeof vaultRecords.$inferSelect,
  edits: VaultRecordEditSummary[] = [],
  media: { pageSnapshots?: VaultRecordPageSnapshotDTO[]; diagrams?: VaultRecordDiagramDTO[] } = {}
): VaultRecordDTO {
  return {
    id: row.id,
    recordType: row.recordType,
    recordDate: row.recordDate,
    sourceFacility: row.sourceFacility,
    sourceDoctorName: row.sourceDoctorName,
    diagnosis: row.diagnosis,
    diagnosisCode: row.diagnosisCode,
    advice: row.advice,
    medicines: (row.medicines as ExtractedMedicine[] | null) ?? [],
    vitals: (row.vitals as VitalsData | null) ?? null,
    labResults: (row.labResults as LabResultEntry[] | null) ?? [],
    findings: row.findings,
    admissionDate: row.admissionDate,
    vaccineDetails: (row.vaccineDetails as VaccineDetailsData | null) ?? null,
    extractionConfidence: row.extractionConfidence,
    extractionStatus: row.extractionStatus,
    patientConfirmed: row.patientConfirmed,
    originalFilename: row.originalFilename,
    createdAt: row.createdAt.toISOString(),
    edits,
    pageSnapshots: media.pageSnapshots ?? [],
    diagrams: media.diagrams ?? [],
  };
}

/** Oldest-first edit history — the transparency/liability record (see vault_record_edits). */
export async function listVaultRecordEdits(
  vaultRecordId: string
): Promise<VaultRecordEditSummary[]> {
  const rows = await db
    .select()
    .from(vaultRecordEdits)
    .where(eq(vaultRecordEdits.vaultRecordId, vaultRecordId))
    .orderBy(asc(vaultRecordEdits.editedAt));
  return rows.map((r) => ({
    editedAt: r.editedAt.toISOString(),
    changedFields: r.changedFields as string[],
    previousValues: r.previousValues as Record<string, unknown>,
  }));
}

const TRACKED_EDIT_FIELDS = [
  "recordType",
  "recordDate",
  "sourceFacility",
  "sourceDoctorName",
  "diagnosis",
  "diagnosisCode",
  "advice",
  "medicines",
  "vitals",
  "labResults",
  "findings",
  "admissionDate",
  "vaccineDetails",
] as const;

/**
 * Diffs a row's current values against an incoming patch. Returns null when
 * nothing actually changed (a re-save with identical values logs nothing).
 */
function diffForEdit(
  current: typeof vaultRecords.$inferSelect,
  patch: VaultRecordPatch
): { changedFields: string[]; previousValues: Record<string, unknown> } | null {
  const before: Record<string, unknown> = {
    recordType: current.recordType,
    recordDate: current.recordDate,
    sourceFacility: current.sourceFacility,
    sourceDoctorName: current.sourceDoctorName,
    diagnosis: current.diagnosis,
    diagnosisCode: current.diagnosisCode,
    advice: current.advice,
    medicines: (current.medicines as ExtractedMedicine[] | null) ?? [],
    vitals: (current.vitals as VitalsData | null) ?? null,
    labResults: (current.labResults as LabResultEntry[] | null) ?? [],
    findings: current.findings,
    admissionDate: current.admissionDate,
    vaccineDetails: (current.vaccineDetails as VaccineDetailsData | null) ?? null,
  };
  const after: Record<string, unknown> = { ...patch };

  const changedFields: string[] = [];
  const previousValues: Record<string, unknown> = {};
  for (const field of TRACKED_EDIT_FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      changedFields.push(field);
      previousValues[field] = before[field];
    }
  }
  return changedFields.length ? { changedFields, previousValues } : null;
}

/**
 * Upload step — stores the file once, runs the stub extraction immediately so
 * the review screen has something to navigate to without delay, and — when
 * the Prescription Analyzer is configured — also fires a real background pass
 * against the same bytes. `getVaultRecord` below picks up that result once it
 * lands. Not yet visible in the vault timeline or any share bundle until the
 * patient confirms via updateVaultRecord — nothing here is trusted onto the
 * record until a human has looked at it.
 */
export async function createVaultRecord(
  patientId: string,
  file: { buffer: Buffer; filename: string; mimeType: string }
): Promise<VaultRecordDTO> {
  const extracted = await extractRecordFields(file.buffer, file.mimeType);

  const [row] = await db
    .insert(vaultRecords)
    .values({
      patientId,
      recordType: extracted.recordType ?? "prescription",
      recordDate: extracted.recordDate,
      sourceFacility: extracted.sourceFacility,
      sourceDoctorName: extracted.sourceDoctorName,
      diagnosis: extracted.diagnosis,
      advice: extracted.advice,
      medicines: extracted.medicines,
      extractionConfidence: extracted.confidence,
      originalFilename: file.filename,
      mimeType: file.mimeType,
      data: file.buffer,
      patientConfirmed: false,
    })
    .returning();

  if (await analyzerAvailable()) {
    const analysis = await createAnalysis({
      uploaderId: patientId,
      filename: file.filename,
      mimeType: file.mimeType,
      data: file.buffer,
      vaultRecordId: row.id,
    });
    await db
      .update(vaultRecords)
      .set({ extractionStatus: "processing" })
      .where(eq(vaultRecords.id, row.id));
    // Fire-and-forget, same as the standalone analyzer's own upload handler —
    // runAnalysisJob records its own failures on the analysis row.
    await runAnalysisJob(analysis.id);
    return toDTO({ ...row, extractionStatus: "processing" });
  }

  return toDTO(row);
}

/**
 * Creates a record directly from an already-succeeded analysis run on the
 * standalone Prescription Analyzer page — the "Save to Vault" bridge. Fields
 * are pre-filled and marked "synced" (no polling needed, it's already done),
 * but `patientConfirmed` still starts false: the review screen is still the
 * only door into the timeline/share bundle.
 */
export async function createVaultRecordFromAnalysis(
  patientId: string,
  analysisId: string
): Promise<{ record: VaultRecordDTO | null; error?: string }> {
  const analysis = await getAnalysisWithDataForUploader(analysisId, patientId);
  if (!analysis) {
    return { record: null, error: "Analysis not found" };
  }
  if (analysis.status !== "succeeded" || !analysis.result) {
    return { record: null, error: "This analysis hasn't finished yet" };
  }

  const mapped = analyzedPrescriptionToRecordFields(analysis.result as AnalyzedPrescriptionLike);

  const [row] = await db
    .insert(vaultRecords)
    .values({
      patientId,
      recordType: mapped.recordType ?? "prescription",
      recordDate: mapped.recordDate,
      sourceFacility: mapped.sourceFacility,
      sourceDoctorName: mapped.sourceDoctorName,
      diagnosis: mapped.diagnosis,
      advice: mapped.advice,
      medicines: mapped.medicines,
      extractionConfidence: mapped.confidence,
      extractionStatus: "synced",
      originalFilename: analysis.filename,
      mimeType: analysis.mimeType,
      data: analysis.data,
      patientConfirmed: false,
    })
    .returning();

  await linkAnalysisToVaultRecord(analysisId, row.id);

  return { record: toDTO(row) };
}

export interface VaultRecordPatch {
  recordType: VaultRecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  diagnosisCode: string | null;
  advice: string | null;
  medicines: ExtractedMedicine[];
  vitals: VitalsData | null;
  labResults: LabResultEntry[];
  findings: string | null;
  admissionDate: string | null;
  vaccineDetails: VaccineDetailsData | null;
}

export interface VaultRecordUpdateResult {
  record: VaultRecordDTO | null;
  errors?: string[];
}

/**
 * Review step — patient corrects/completes the fields and confirms. Validated
 * against the vault's baseline mandatory fields first (vault-validation.ts);
 * a record that fails validation is neither saved nor confirmed.
 */
export async function updateVaultRecord(
  id: string,
  patientId: string,
  patch: VaultRecordPatch
): Promise<VaultRecordUpdateResult> {
  const errors = validateVaultRecordPatch(patch);
  if (errors.length > 0) {
    return { record: null, errors };
  }

  const [existing] = await db
    .select()
    .from(vaultRecords)
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)));
  if (!existing) {
    return { record: null };
  }

  // Computed against the row's state right before this save — including the
  // very first confirm, so "extraction said X, patient's first save set Y"
  // is captured too, not just edits made after the record was already saved.
  const diff = diffForEdit(existing, patch);

  const [row] = await db
    .update(vaultRecords)
    .set({
      recordType: patch.recordType,
      recordDate: patch.recordDate,
      sourceFacility: patch.sourceFacility,
      sourceDoctorName: patch.sourceDoctorName,
      diagnosis: patch.diagnosis,
      diagnosisCode: patch.diagnosisCode,
      advice: patch.advice,
      medicines: patch.medicines,
      vitals: patch.vitals,
      labResults: patch.labResults,
      findings: patch.findings,
      admissionDate: patch.admissionDate,
      vaccineDetails: patch.vaccineDetails,
      patientConfirmed: true,
      updatedAt: new Date(),
    })
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)))
    .returning();
  if (!row) {
    return { record: null };
  }

  if (diff) {
    await db.insert(vaultRecordEdits).values({
      vaultRecordId: id,
      changedFields: diff.changedFields,
      previousValues: diff.previousValues,
    });
  }

  return { record: toDTO(row, await listVaultRecordEdits(id)) };
}

export async function deleteVaultRecord(id: string, patientId: string): Promise<boolean> {
  const result = await db
    .delete(vaultRecords)
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)))
    .returning({ id: vaultRecords.id });
  return result.length > 0;
}

/**
 * Powers the review screen, including the polling GET while extraction is
 * still running. If a linked analysis has finished since the last read, this
 * does a one-time write-back of its fields — but only while the patient
 * hasn't confirmed yet (`patientConfirmed=false` guard on the UPDATE), so a
 * manual save can never be silently overwritten by a late-arriving result.
 */
export async function getVaultRecord(id: string, patientId: string): Promise<VaultRecordDTO | null> {
  const [row] = await db
    .select()
    .from(vaultRecords)
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)));
  if (!row) return null;

  // Fetched once up front and threaded through every branch below — both
  // queries only return rows once the linked analysis has succeeded, so a
  // still-processing record simply gets empty arrays, no extra branching
  // needed to special-case that.
  const [pageSnapshots, diagrams] = await Promise.all([
    listPageSnapshotsForVaultRecord(id, patientId),
    listDiagramsForVaultRecord(id, patientId),
  ]);
  const media = { pageSnapshots, diagrams };

  if (row.extractionStatus !== "processing" || row.patientConfirmed) {
    return toDTO(row, await listVaultRecordEdits(id), media);
  }

  const analysis = await getAnalysisByVaultRecordId(row.id);
  if (!analysis || (analysis.status !== "succeeded" && analysis.status !== "failed")) {
    return toDTO(row, [], media); // still queued/processing — caller keeps polling, no edits possible yet
  }

  if (analysis.status === "failed") {
    const [updated] = await db
      .update(vaultRecords)
      .set({ extractionStatus: "failed", updatedAt: new Date() })
      .where(and(eq(vaultRecords.id, row.id), eq(vaultRecords.patientConfirmed, false)))
      .returning();
    return toDTO(updated ?? row, [], media);
  }

  const mapped = analyzedPrescriptionToRecordFields(analysis.result as AnalyzedPrescriptionLike);
  const [updated] = await db
    .update(vaultRecords)
    .set({
      recordType: mapped.recordType ?? row.recordType,
      recordDate: mapped.recordDate,
      sourceFacility: mapped.sourceFacility,
      sourceDoctorName: mapped.sourceDoctorName,
      diagnosis: mapped.diagnosis,
      advice: mapped.advice,
      medicines: mapped.medicines,
      extractionConfidence: mapped.confidence,
      extractionStatus: "synced",
      updatedAt: new Date(),
    })
    .where(and(eq(vaultRecords.id, row.id), eq(vaultRecords.patientConfirmed, false)))
    .returning();
  return toDTO(updated ?? row, [], media);
}

/** Confirmed Tier 2 records only — unreviewed uploads never surface here. */
export async function listConfirmedVaultRecords(patientId: string) {
  return db
    .select()
    .from(vaultRecords)
    .where(and(eq(vaultRecords.patientId, patientId), eq(vaultRecords.patientConfirmed, true)))
    .orderBy(desc(vaultRecords.recordDate));
}

/**
 * Batched "has this record ever been edited" check, for the share bundle
 * (vault-share.ts) — a doctor reading a Flow A share sees whether an added
 * record is as-extracted or patient-corrected, without an N+1 query per row.
 */
export async function vaultRecordIdsWithEdits(vaultRecordIds: string[]): Promise<Set<string>> {
  if (vaultRecordIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ vaultRecordId: vaultRecordEdits.vaultRecordId })
    .from(vaultRecordEdits)
    .where(inArray(vaultRecordEdits.vaultRecordId, vaultRecordIds));
  return new Set(rows.map((r) => r.vaultRecordId));
}
