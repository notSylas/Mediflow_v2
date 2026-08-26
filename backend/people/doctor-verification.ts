import { and, asc, eq } from "drizzle-orm";
import { db } from "~backend/db";
import {
  doctorProfiles,
  doctorVerificationDocuments,
  systemOfMedicine,
  user,
} from "~backend/db/schema";
import { getOrCreateDoctorProfile } from "./doctor";

/**
 * RMP verification — a doctor submits registration details + documents, an
 * admin manually cross-checks them against NMC's public Indian Medical
 * Register (and optionally the doctor's HPR ID) and approves/rejects. No
 * automated NMC/HPR lookup — see docs/PRODUCT.md's Phase 1 note on
 * "layered manual" verification.
 */

export const ALLOWED_VERIFICATION_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_VERIFICATION_DOC_SIZE_BYTES = 5 * 1024 * 1024;

/** identity + registration must both be uploaded before submitting; hpr is optional. */
export const REQUIRED_VERIFICATION_DOC_KINDS = ["identity", "registration"] as const;

export interface DoctorVerificationFields {
  registrationNo: string;
  stateMedicalCouncil: string;
  yearOfRegistration: number;
  systemOfMedicine: (typeof systemOfMedicine.enumValues)[number];
  hprId: string | null;
}

export type SubmitVerificationResult =
  | { ok: true }
  | { ok: false; reason: "invalid_status" | "missing_documents" };

/**
 * Stores/replaces one uploaded document. At most one row per (doctorId,
 * kind) — a re-upload replaces the previous one, no history kept, same
 * convention as the doctor signature column.
 */
export async function upsertVerificationDocument(
  doctorProfileId: string,
  kind: (typeof doctorVerificationDocuments.$inferInsert)["kind"],
  file: { buffer: Buffer; filename: string; mimeType: string }
): Promise<void> {
  await db
    .delete(doctorVerificationDocuments)
    .where(
      and(
        eq(doctorVerificationDocuments.doctorId, doctorProfileId),
        eq(doctorVerificationDocuments.kind, kind)
      )
    );

  await db.insert(doctorVerificationDocuments).values({
    doctorId: doctorProfileId,
    kind,
    filename: file.filename,
    mimeType: file.mimeType,
    data: file.buffer,
  });
}

/**
 * Doctor-side submit. Requires both required document kinds to already be
 * uploaded (server-enforced, not just a UI convention) and the profile to
 * be in a resubmittable state — no overwriting a pending or already-verified
 * review. Flips verificationStatus to "pending" for the admin queue.
 */
export async function submitDoctorVerification(
  userId: string,
  fields: DoctorVerificationFields
): Promise<SubmitVerificationResult> {
  const profile = await getOrCreateDoctorProfile(userId);

  if (profile.verificationStatus !== "unverified" && profile.verificationStatus !== "rejected") {
    return { ok: false, reason: "invalid_status" };
  }

  const docs = await db
    .select({ kind: doctorVerificationDocuments.kind })
    .from(doctorVerificationDocuments)
    .where(eq(doctorVerificationDocuments.doctorId, profile.id));
  const uploadedKinds = new Set(docs.map((d) => d.kind));
  const missingRequired = REQUIRED_VERIFICATION_DOC_KINDS.some((k) => !uploadedKinds.has(k));
  if (missingRequired) {
    return { ok: false, reason: "missing_documents" };
  }

  await db
    .update(doctorProfiles)
    .set({
      registrationNo: fields.registrationNo,
      stateMedicalCouncil: fields.stateMedicalCouncil,
      yearOfRegistration: fields.yearOfRegistration,
      systemOfMedicine: fields.systemOfMedicine,
      hprId: fields.hprId,
      verificationStatus: "pending",
      verificationNotes: null,
      updatedAt: new Date(),
    })
    .where(eq(doctorProfiles.id, profile.id));

  return { ok: true };
}

/** Pending queue, oldest submission first (fairness — first in, first reviewed). */
export async function listPendingDoctorVerifications() {
  return db
    .select({
      doctorId: doctorProfiles.id,
      userId: doctorProfiles.userId,
      name: user.name,
      email: user.email,
      registrationNo: doctorProfiles.registrationNo,
      stateMedicalCouncil: doctorProfiles.stateMedicalCouncil,
      yearOfRegistration: doctorProfiles.yearOfRegistration,
      systemOfMedicine: doctorProfiles.systemOfMedicine,
      submittedAt: doctorProfiles.updatedAt,
    })
    .from(doctorProfiles)
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .where(eq(doctorProfiles.verificationStatus, "pending"))
    .orderBy(asc(doctorProfiles.updatedAt));
}

/**
 * Full detail for one doctor's review — fields + document metadata, never
 * bytes (mirrors getDoctorSignatureUrl's separation, backend/people/doctor.ts)
 * so this stays cheap even though it's the admin's main working view.
 */
export async function getDoctorVerificationDetail(doctorProfileId: string) {
  const [profile] = await db
    .select({
      doctorId: doctorProfiles.id,
      userId: doctorProfiles.userId,
      name: user.name,
      email: user.email,
      registrationNo: doctorProfiles.registrationNo,
      stateMedicalCouncil: doctorProfiles.stateMedicalCouncil,
      yearOfRegistration: doctorProfiles.yearOfRegistration,
      systemOfMedicine: doctorProfiles.systemOfMedicine,
      hprId: doctorProfiles.hprId,
      verificationStatus: doctorProfiles.verificationStatus,
      verificationNotes: doctorProfiles.verificationNotes,
      verifiedAt: doctorProfiles.verifiedAt,
    })
    .from(doctorProfiles)
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .where(eq(doctorProfiles.id, doctorProfileId));

  if (!profile) return null;

  const documents = await db
    .select({
      id: doctorVerificationDocuments.id,
      kind: doctorVerificationDocuments.kind,
      filename: doctorVerificationDocuments.filename,
      mimeType: doctorVerificationDocuments.mimeType,
      createdAt: doctorVerificationDocuments.createdAt,
    })
    .from(doctorVerificationDocuments)
    .where(eq(doctorVerificationDocuments.doctorId, doctorProfileId));

  return { ...profile, documents };
}

/** One document's bytes, for the admin download route only. */
export async function getVerificationDocument(documentId: string) {
  const [row] = await db
    .select()
    .from(doctorVerificationDocuments)
    .where(eq(doctorVerificationDocuments.id, documentId));
  return row ?? null;
}

export type VerificationDecision = "verified" | "rejected";

/** Admin approve/reject. Only valid from "pending" — no deciding twice. */
export async function decideDoctorVerification(
  doctorProfileId: string,
  adminUserId: string,
  decision: VerificationDecision,
  notes: string | null
): Promise<boolean> {
  const result = await db
    .update(doctorProfiles)
    .set({
      verificationStatus: decision,
      verifiedAt: new Date(),
      verifiedByUserId: adminUserId,
      verificationNotes: notes,
      updatedAt: new Date(),
    })
    .where(and(eq(doctorProfiles.id, doctorProfileId), eq(doctorProfiles.verificationStatus, "pending")))
    .returning({ id: doctorProfiles.id });

  return result.length > 0;
}
