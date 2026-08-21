import { and, desc, eq } from "drizzle-orm";
import { db } from "~backend/db";
import { vaultRecords } from "~backend/db/schema";
import {
  extractRecordFields,
  type ExtractedMedicine,
  type VaultRecordType,
} from "./vault-extraction";

export interface VaultRecordDTO {
  id: string;
  recordType: VaultRecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  advice: string | null;
  medicines: ExtractedMedicine[];
  extractionConfidence: "high" | "medium" | "low" | null;
  patientConfirmed: boolean;
  originalFilename: string;
  createdAt: string;
}

function toDTO(row: typeof vaultRecords.$inferSelect): VaultRecordDTO {
  return {
    id: row.id,
    recordType: row.recordType,
    recordDate: row.recordDate,
    sourceFacility: row.sourceFacility,
    sourceDoctorName: row.sourceDoctorName,
    diagnosis: row.diagnosis,
    advice: row.advice,
    medicines: (row.medicines as ExtractedMedicine[] | null) ?? [],
    extractionConfidence: row.extractionConfidence,
    patientConfirmed: row.patientConfirmed,
    originalFilename: row.originalFilename,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Upload step — stores the file once, runs extraction (currently always a
 * low-confidence stub, see vault-extraction.ts), inserts immediately with
 * whatever came back. Not yet visible in the vault timeline or any share
 * bundle until the patient confirms via updateVaultRecord — nothing here is
 * trusted onto the record until a human has looked at it.
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

  return toDTO(row);
}

export interface VaultRecordPatch {
  recordType: VaultRecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  advice: string | null;
  medicines: ExtractedMedicine[];
}

/** Review step — patient corrects/completes the fields and confirms. */
export async function updateVaultRecord(
  id: string,
  patientId: string,
  patch: VaultRecordPatch
): Promise<VaultRecordDTO | null> {
  const [row] = await db
    .update(vaultRecords)
    .set({
      recordType: patch.recordType,
      recordDate: patch.recordDate,
      sourceFacility: patch.sourceFacility,
      sourceDoctorName: patch.sourceDoctorName,
      diagnosis: patch.diagnosis,
      advice: patch.advice,
      medicines: patch.medicines,
      patientConfirmed: true,
      updatedAt: new Date(),
    })
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)))
    .returning();

  return row ? toDTO(row) : null;
}

export async function deleteVaultRecord(id: string, patientId: string): Promise<boolean> {
  const result = await db
    .delete(vaultRecords)
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)))
    .returning({ id: vaultRecords.id });
  return result.length > 0;
}

export async function getVaultRecord(id: string, patientId: string): Promise<VaultRecordDTO | null> {
  const [row] = await db
    .select()
    .from(vaultRecords)
    .where(and(eq(vaultRecords.id, id), eq(vaultRecords.patientId, patientId)));
  return row ? toDTO(row) : null;
}

/** Confirmed Tier 2 records only — unreviewed uploads never surface here. */
export async function listConfirmedVaultRecords(patientId: string) {
  return db
    .select()
    .from(vaultRecords)
    .where(and(eq(vaultRecords.patientId, patientId), eq(vaultRecords.patientConfirmed, true)))
    .orderBy(desc(vaultRecords.recordDate));
}
