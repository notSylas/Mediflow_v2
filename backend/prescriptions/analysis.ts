import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "~backend/db";
import {
  prescriptionAnalyses,
  prescriptionDiagrams,
  prescriptionPageSnapshots,
  vaultRecords,
} from "~backend/db/schema";

/**
 * Prescription Analyzer — data access for the queued vision-LLM pass.
 *
 * The analysis itself runs in a separate Python container as a Cloud Run Job
 * (see prescription-analyzer/job.py and backend/prescriptions/job-runner.ts).
 * This module only owns the row: create it queued, read status, and expose
 * the terminal result. The job writes `status`/`result`/`error` back directly,
 * so nothing here polls the model.
 */

/** Mirrors prescription-analyzer/prescription_analyzer/schema.py. */
export interface AnalyzedMedication {
  raw_text: string | null;
  name: string | null;
  generic_name: string | null;
  strength: string | null;
  form: string | null;
  dose: string | null;
  frequency_raw: string | null;
  frequency: string | null;
  route: string | null;
  duration: string | null;
  instructions: string | null;
  confidence: number;
  needs_verification: boolean;
}

export interface AnalyzedPrescription {
  doctor: {
    name: string | null;
    qualifications: string[];
    specialty: string | null;
    registration_no: string | null;
    clinic_or_hospital: string | null;
    confidence: number;
  };
  patient: {
    name: string | null;
    age: string | null;
    sex: string | null;
    weight: string | null;
    date: string | null;
    confidence: number;
  };
  diagnosis: string[];
  vitals: { name: string | null; value: string | null; confidence: number }[];
  lab_findings: {
    name: string | null;
    value: string | null;
    status: string | null;
    confidence: number;
  }[];
  medications: AnalyzedMedication[];
  investigations: string[];
  advice: string[];
  follow_up: string | null;
  raw_transcription: string | null;
  warnings: string[];
  overall_confidence: number;
  pages_analyzed: number;
}

export const ALLOWED_ANALYSIS_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "image/bmp",
] as const;

/**
 * No product-level cap: a multi-page scan of a hospital prescription is
 * routinely larger than the 5 MB used for chat attachments, and refusing it
 * helped nobody.
 *
 * 32 MB is Cloud Run's hard request-body limit, not a choice — a larger upload
 * is rejected by the platform before any of our code runs. Checking it here
 * only means the user gets a sentence instead of an opaque 413.
 */
export const MAX_ANALYSIS_BYTES = 32 * 1024 * 1024;

export interface NewAnalysis {
  uploaderId: string;
  filename: string;
  mimeType: string;
  data: Buffer;
  vaultRecordId?: string | null;
}

/** Inserts a queued row. The caller triggers the job after this commits. */
export async function createAnalysis(input: NewAnalysis) {
  const [row] = await db
    .insert(prescriptionAnalyses)
    .values({
      uploaderId: input.uploaderId,
      filename: input.filename,
      mimeType: input.mimeType,
      byteSize: input.data.length,
      data: input.data,
      vaultRecordId: input.vaultRecordId ?? null,
    })
    .returning({
      id: prescriptionAnalyses.id,
      status: prescriptionAnalyses.status,
      createdAt: prescriptionAnalyses.createdAt,
    });
  return row;
}

/**
 * Status view for polling. Deliberately omits `data` — the UI never needs the
 * file back, and a 5 MB blob on every poll would be absurd.
 */
export async function getAnalysisForUploader(id: string, uploaderId: string) {
  const [row] = await db
    .select({
      id: prescriptionAnalyses.id,
      status: prescriptionAnalyses.status,
      filename: prescriptionAnalyses.filename,
      mimeType: prescriptionAnalyses.mimeType,
      byteSize: prescriptionAnalyses.byteSize,
      attempts: prescriptionAnalyses.attempts,
      overallConfidence: prescriptionAnalyses.overallConfidence,
      result: prescriptionAnalyses.result,
      error: prescriptionAnalyses.error,
      createdAt: prescriptionAnalyses.createdAt,
      startedAt: prescriptionAnalyses.startedAt,
      completedAt: prescriptionAnalyses.completedAt,
    })
    .from(prescriptionAnalyses)
    .where(
      and(
        eq(prescriptionAnalyses.id, id),
        eq(prescriptionAnalyses.uploaderId, uploaderId)
      )
    );
  return row ?? null;
}

/**
 * Server-only read that includes the file bytes — used solely by the
 * "push this already-analyzed result into the vault" path, which needs to
 * copy the bytes into a new vault_records row rather than re-upload them.
 * Never exposed over the polling GET (see getAnalysisForUploader above).
 */
export async function getAnalysisWithDataForUploader(id: string, uploaderId: string) {
  const [row] = await db
    .select()
    .from(prescriptionAnalyses)
    .where(
      and(
        eq(prescriptionAnalyses.id, id),
        eq(prescriptionAnalyses.uploaderId, uploaderId)
      )
    );
  return row ?? null;
}

/** Links a vault record to the analysis it was created from, for traceability. */
export async function linkAnalysisToVaultRecord(analysisId: string, vaultRecordId: string) {
  await db
    .update(prescriptionAnalyses)
    .set({ vaultRecordId })
    .where(eq(prescriptionAnalyses.id, analysisId));
}

/**
 * The latest analysis linked to a vault record, if any — used by the vault
 * upload path to poll whether its background extraction has landed yet.
 */
export async function getAnalysisByVaultRecordId(vaultRecordId: string) {
  const [row] = await db
    .select({
      id: prescriptionAnalyses.id,
      status: prescriptionAnalyses.status,
      result: prescriptionAnalyses.result,
    })
    .from(prescriptionAnalyses)
    .where(eq(prescriptionAnalyses.vaultRecordId, vaultRecordId))
    .orderBy(desc(prescriptionAnalyses.createdAt))
    .limit(1);
  return row ?? null;
}

/** The uploader's own analyses, newest first, without file bytes or results. */
export async function listAnalyses(uploaderId: string, limit = 20) {
  return db
    .select({
      id: prescriptionAnalyses.id,
      status: prescriptionAnalyses.status,
      filename: prescriptionAnalyses.filename,
      overallConfidence: prescriptionAnalyses.overallConfidence,
      createdAt: prescriptionAnalyses.createdAt,
      completedAt: prescriptionAnalyses.completedAt,
    })
    .from(prescriptionAnalyses)
    .where(eq(prescriptionAnalyses.uploaderId, uploaderId))
    .orderBy(desc(prescriptionAnalyses.createdAt))
    .limit(limit);
}

/** Records which Cloud Run execution owns this row, so failures are traceable. */
export async function recordJobExecution(id: string, execution: string) {
  await db
    .update(prescriptionAnalyses)
    .set({ jobExecution: execution })
    .where(eq(prescriptionAnalyses.id, id));
}

/**
 * Marks a row failed from the Node side — used when the job could not even be
 * started. Without this the row would sit in `queued` forever and the UI would
 * spin with no explanation.
 */
export async function failAnalysis(id: string, message: string) {
  await db
    .update(prescriptionAnalyses)
    .set({ status: "failed", error: message.slice(0, 2000), completedAt: new Date() })
    .where(eq(prescriptionAnalyses.id, id));
}

/** True once the row will not change again. */
export function isTerminal(status: string): boolean {
  return status === "succeeded" || status === "failed";
}

/**
 * Diagram crops for one analysis, newest-confidence first. Bytes are excluded:
 * the list drives thumbnails, and each image is fetched by its own URL so the
 * browser can cache it.
 */
export async function listDiagrams(analysisId: string, uploaderId: string) {
  return db
    .select({
      id: prescriptionDiagrams.id,
      pageIndex: prescriptionDiagrams.pageIndex,
      confidence: prescriptionDiagrams.confidence,
      width: sql<number>`${prescriptionDiagrams.x2} - ${prescriptionDiagrams.x1}`,
      height: sql<number>`${prescriptionDiagrams.y2} - ${prescriptionDiagrams.y1}`,
    })
    .from(prescriptionDiagrams)
    .innerJoin(
      prescriptionAnalyses,
      eq(prescriptionAnalyses.id, prescriptionDiagrams.analysisId)
    )
    .where(
      and(
        eq(prescriptionDiagrams.analysisId, analysisId),
        // Ownership is enforced through the parent analysis, so a diagram id
        // alone is never enough to read someone else's prescription.
        eq(prescriptionAnalyses.uploaderId, uploaderId)
      )
    )
    .orderBy(desc(prescriptionDiagrams.confidence));
}

/** One diagram's bytes, ownership-checked through its parent analysis. */
export async function getDiagramImage(diagramId: string, uploaderId: string) {
  const [row] = await db
    .select({
      data: prescriptionDiagrams.data,
      mimeType: prescriptionDiagrams.mimeType,
    })
    .from(prescriptionDiagrams)
    .innerJoin(
      prescriptionAnalyses,
      eq(prescriptionAnalyses.id, prescriptionDiagrams.analysisId)
    )
    .where(
      and(
        eq(prescriptionDiagrams.id, diagramId),
        eq(prescriptionAnalyses.uploaderId, uploaderId)
      )
    );
  return row ?? null;
}

/**
 * Rendered pages for one analysis, in page order — the analyzer's own vision
 * pass renders these already; this is just a saved copy so the source stays
 * visible after the fact, instead of being thrown away once analysis ends.
 */
export async function listPageSnapshots(analysisId: string, uploaderId: string) {
  return db
    .select({
      id: prescriptionPageSnapshots.id,
      pageIndex: prescriptionPageSnapshots.pageIndex,
    })
    .from(prescriptionPageSnapshots)
    .innerJoin(
      prescriptionAnalyses,
      eq(prescriptionAnalyses.id, prescriptionPageSnapshots.analysisId)
    )
    .where(
      and(
        eq(prescriptionPageSnapshots.analysisId, analysisId),
        eq(prescriptionAnalyses.uploaderId, uploaderId)
      )
    )
    .orderBy(prescriptionPageSnapshots.pageIndex);
}

/** One rendered page's bytes, ownership-checked through its parent analysis. */
export async function getPageSnapshotImage(snapshotId: string, uploaderId: string) {
  const [row] = await db
    .select({
      data: prescriptionPageSnapshots.data,
      mimeType: prescriptionPageSnapshots.mimeType,
    })
    .from(prescriptionPageSnapshots)
    .innerJoin(
      prescriptionAnalyses,
      eq(prescriptionAnalyses.id, prescriptionPageSnapshots.analysisId)
    )
    .where(
      and(
        eq(prescriptionPageSnapshots.id, snapshotId),
        eq(prescriptionAnalyses.uploaderId, uploaderId)
      )
    );
  return row ?? null;
}

/**
 * Diagram crops reachable through a vault record — joins through the
 * analysis that was triggered from that record's upload
 * (backend/vault/vault-records.ts sets vaultRecordId when it fires the
 * analyzer job). Ownership is checked on the vault record's patient, not the
 * analysis uploader, since this is called from the vault side.
 */
export async function listDiagramsForVaultRecord(vaultRecordId: string, patientId: string) {
  return db
    .select({
      id: prescriptionDiagrams.id,
      pageIndex: prescriptionDiagrams.pageIndex,
      confidence: prescriptionDiagrams.confidence,
      width: sql<number>`${prescriptionDiagrams.x2} - ${prescriptionDiagrams.x1}`,
      height: sql<number>`${prescriptionDiagrams.y2} - ${prescriptionDiagrams.y1}`,
    })
    .from(prescriptionDiagrams)
    .innerJoin(
      prescriptionAnalyses,
      eq(prescriptionAnalyses.id, prescriptionDiagrams.analysisId)
    )
    .innerJoin(vaultRecords, eq(vaultRecords.id, prescriptionAnalyses.vaultRecordId))
    .where(
      and(
        eq(prescriptionAnalyses.vaultRecordId, vaultRecordId),
        eq(vaultRecords.patientId, patientId),
        eq(prescriptionAnalyses.status, "succeeded")
      )
    )
    .orderBy(desc(prescriptionDiagrams.confidence));
}

/** Rendered pages reachable through a vault record — same join as above. */
export async function listPageSnapshotsForVaultRecord(vaultRecordId: string, patientId: string) {
  return db
    .select({
      id: prescriptionPageSnapshots.id,
      pageIndex: prescriptionPageSnapshots.pageIndex,
    })
    .from(prescriptionPageSnapshots)
    .innerJoin(
      prescriptionAnalyses,
      eq(prescriptionAnalyses.id, prescriptionPageSnapshots.analysisId)
    )
    .innerJoin(vaultRecords, eq(vaultRecords.id, prescriptionAnalyses.vaultRecordId))
    .where(
      and(
        eq(prescriptionAnalyses.vaultRecordId, vaultRecordId),
        eq(vaultRecords.patientId, patientId),
        eq(prescriptionAnalyses.status, "succeeded")
      )
    )
    .orderBy(prescriptionPageSnapshots.pageIndex);
}
