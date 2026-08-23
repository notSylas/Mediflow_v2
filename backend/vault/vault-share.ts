import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "~backend/db";
import {
  appointments,
  consultNotes,
  doctorProfiles,
  prescriptionMedicines,
  prescriptions,
  user,
  vaultRecords,
  vaultShareAccessLog,
  vaultShareGrants,
} from "~backend/db/schema";
import { decryptBundle, encryptBundle, generateDataKey, unwrapDataKey } from "./vault-crypto";
import type { ExtractedMedicine } from "./vault-extraction";
import {
  listConfirmedVaultRecords,
  vaultRecordIdsWithEdits,
  type LabResultEntry,
  type VaccineDetailsData,
  type VitalsData,
} from "./vault-records";
import {
  generateShareCode,
  hashSecret,
  resolveScope,
  scopeSummary,
  type ScopeSummary,
  type VaultShareScope,
} from "./vault-share-policy";

export interface BundleMedicine {
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

export interface BundlePrescription {
  id: string;
  diagnosis: string | null;
  advice: string | null;
  issuedAt: string | null;
  doctorName: string;
  medicines: BundleMedicine[];
}

export interface BundleConsultNote {
  date: string;
  doctorName: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
}

export interface BundleAddedRecord {
  recordType: string;
  date: string | null;
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
  // True if the patient corrected any field after the initial extraction —
  // surfaced so a receiving doctor knows whether this is as-read or
  // human-corrected (see vault_record_edits).
  wasEdited: boolean;
}

export interface VaultBundle {
  prescriptions: BundlePrescription[];
  consultNotes: BundleConsultNote[];
  addedRecords: BundleAddedRecord[];
}

/** Everything shared in a Flow A bundle — issued prescriptions + non-empty consult notes, scoped by date. */
async function assembleBundle(
  patientId: string,
  scopeFrom: Date | null,
  scopeTo: Date
): Promise<VaultBundle> {
  const rxWhere = scopeFrom
    ? and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.status, "issued"),
        gte(prescriptions.issuedAt, scopeFrom),
        lte(prescriptions.issuedAt, scopeTo)
      )
    : and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.status, "issued"),
        lte(prescriptions.issuedAt, scopeTo)
      );

  const rxRows = await db
    .select({
      id: prescriptions.id,
      diagnosis: prescriptions.diagnosis,
      advice: prescriptions.advice,
      issuedAt: prescriptions.issuedAt,
      doctorName: user.name,
    })
    .from(prescriptions)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, prescriptions.doctorId))
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .where(rxWhere)
    .orderBy(desc(prescriptions.issuedAt));

  const prescriptionIds = rxRows.map((r) => r.id);
  const medicineRows = prescriptionIds.length
    ? await db
        .select()
        .from(prescriptionMedicines)
        .where(inArray(prescriptionMedicines.prescriptionId, prescriptionIds))
    : [];

  const noteWhere = scopeFrom
    ? and(
        eq(appointments.patientId, patientId),
        gte(appointments.startsAt, scopeFrom),
        lte(appointments.startsAt, scopeTo)
      )
    : and(eq(appointments.patientId, patientId), lte(appointments.startsAt, scopeTo));

  const noteRows = await db
    .select({
      subjective: consultNotes.subjective,
      objective: consultNotes.objective,
      assessment: consultNotes.assessment,
      plan: consultNotes.plan,
      startsAt: appointments.startsAt,
      doctorName: user.name,
    })
    .from(consultNotes)
    .innerJoin(appointments, eq(appointments.id, consultNotes.appointmentId))
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .where(noteWhere)
    .orderBy(desc(appointments.startsAt));

  // Tier 2 — confirmed, patient-added records from any other doctor. Scoped
  // by recordDate the same way as everything else; a record with no date
  // (shouldn't happen post-confirm, but defensively) is excluded rather than
  // guessed into or out of range.
  const addedWhere = scopeFrom
    ? and(
        eq(vaultRecords.patientId, patientId),
        eq(vaultRecords.patientConfirmed, true),
        gte(vaultRecords.recordDate, scopeFrom.toISOString().slice(0, 10)),
        lte(vaultRecords.recordDate, scopeTo.toISOString().slice(0, 10))
      )
    : and(
        eq(vaultRecords.patientId, patientId),
        eq(vaultRecords.patientConfirmed, true),
        lte(vaultRecords.recordDate, scopeTo.toISOString().slice(0, 10))
      );

  const addedRows = await db
    .select()
    .from(vaultRecords)
    .where(addedWhere)
    .orderBy(desc(vaultRecords.recordDate));

  const editedIds = await vaultRecordIdsWithEdits(addedRows.map((r) => r.id));

  return {
    addedRecords: addedRows.map((r) => ({
      recordType: r.recordType,
      date: r.recordDate,
      sourceFacility: r.sourceFacility,
      sourceDoctorName: r.sourceDoctorName,
      diagnosis: r.diagnosis,
      diagnosisCode: r.diagnosisCode,
      advice: r.advice,
      medicines: (r.medicines as ExtractedMedicine[] | null) ?? [],
      vitals: (r.vitals as VitalsData | null) ?? null,
      labResults: (r.labResults as LabResultEntry[] | null) ?? [],
      findings: r.findings,
      admissionDate: r.admissionDate,
      vaccineDetails: (r.vaccineDetails as VaccineDetailsData | null) ?? null,
      wasEdited: editedIds.has(r.id),
    })),
    prescriptions: rxRows.map((r) => ({
      id: r.id,
      diagnosis: r.diagnosis,
      advice: r.advice,
      issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
      doctorName: r.doctorName,
      medicines: medicineRows
        .filter((m) => m.prescriptionId === r.id)
        .map((m) => ({
          name: m.name,
          strength: m.strength,
          route: m.route,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation,
          durationDays: m.durationDays,
          instructions: m.instructions,
        })),
    })),
    consultNotes: noteRows
      .filter((n) => n.subjective || n.objective || n.assessment || n.plan)
      .map((n) => ({
        date: n.startsAt.toISOString(),
        doctorName: n.doctorName,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
      })),
  };
}

export interface VaultTimelineItem {
  id: string;
  type: "prescription" | "consult_note" | "added_record";
  date: string;
  doctorName: string;
  summary: string;
  // "mediflow" = auto-captured from a real consult (Tier 1); "added" = the
  // patient uploaded it themselves (Tier 2) — surfaced in the UI so
  // provenance is never ambiguous to the patient or a receiving doctor.
  source: "mediflow" | "added";
  // Set for "prescription"/"consult_note" (both are facets of one visit, so
  // both link to that appointment's detail page); null for "added_record",
  // which links to its own vault record page instead.
  appointmentId: string | null;
  // Tier 2 sub-type (lab/scan/discharge_summary/vaccination/prescription/other)
  // — only set for "added_record" items, for icon differentiation in the UI.
  recordType: string | null;
}

/** Read-time aggregation for the vault home screen — never materialized (Rules.md #2). */
export async function getVaultTimeline(patientId: string): Promise<VaultTimelineItem[]> {
  const rxRows = await db
    .select({
      id: prescriptions.id,
      appointmentId: prescriptions.appointmentId,
      diagnosis: prescriptions.diagnosis,
      issuedAt: prescriptions.issuedAt,
      doctorName: user.name,
    })
    .from(prescriptions)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, prescriptions.doctorId))
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, "issued")));

  const prescriptionIds = rxRows.map((r) => r.id);
  const medicineCounts = new Map<string, number>();
  if (prescriptionIds.length) {
    const meds = await db
      .select({ prescriptionId: prescriptionMedicines.prescriptionId })
      .from(prescriptionMedicines)
      .where(inArray(prescriptionMedicines.prescriptionId, prescriptionIds));
    for (const m of meds) {
      medicineCounts.set(m.prescriptionId, (medicineCounts.get(m.prescriptionId) ?? 0) + 1);
    }
  }

  const noteRows = await db
    .select({
      id: consultNotes.id,
      appointmentId: consultNotes.appointmentId,
      subjective: consultNotes.subjective,
      objective: consultNotes.objective,
      assessment: consultNotes.assessment,
      plan: consultNotes.plan,
      startsAt: appointments.startsAt,
      doctorName: user.name,
    })
    .from(consultNotes)
    .innerJoin(appointments, eq(appointments.id, consultNotes.appointmentId))
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    .where(eq(appointments.patientId, patientId));

  const addedRows = await listConfirmedVaultRecords(patientId);

  const items: VaultTimelineItem[] = [];
  for (const r of rxRows) {
    const count = medicineCounts.get(r.id) ?? 0;
    items.push({
      id: r.id,
      type: "prescription",
      date: r.issuedAt ? r.issuedAt.toISOString() : new Date().toISOString(),
      doctorName: r.doctorName,
      summary: r.diagnosis || `${count} medicine${count === 1 ? "" : "s"}`,
      source: "mediflow",
      appointmentId: r.appointmentId,
      recordType: null,
    });
  }
  for (const n of noteRows) {
    if (!n.subjective && !n.objective && !n.assessment && !n.plan) continue;
    items.push({
      id: n.id,
      type: "consult_note",
      date: n.startsAt.toISOString(),
      doctorName: n.doctorName,
      summary: n.assessment || n.plan || "Consultation note",
      source: "mediflow",
      appointmentId: n.appointmentId,
      recordType: null,
    });
  }
  for (const r of addedRows) {
    items.push({
      id: r.id,
      type: "added_record",
      date: r.recordDate ?? r.createdAt.toISOString(),
      doctorName: r.sourceDoctorName || r.sourceFacility || "Added by you",
      summary: r.diagnosis || `${(r.medicines as unknown[] | null)?.length ?? 0} medicine(s)`,
      source: "added",
      appointmentId: null,
      recordType: r.recordType,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

export interface SharePreviewCounts {
  prescriptions: number;
  consultNotes: number;
  addedRecords: number;
}

/**
 * What a share would actually include, for the scope picker on the create
 * screen — so the patient sees this before sending, not blind. Reuses
 * assembleBundle (the exact same query createShare runs) rather than a
 * separate count query, so the preview can never drift from reality.
 */
export async function previewShareCounts(
  patientId: string,
  scope: VaultShareScope
): Promise<SharePreviewCounts> {
  const { scopeFrom, scopeTo } = resolveScope(scope, new Date());
  const bundle = await assembleBundle(patientId, scopeFrom, scopeTo);
  return {
    prescriptions: bundle.prescriptions.length,
    consultNotes: bundle.consultNotes.length,
    addedRecords: bundle.addedRecords.length,
  };
}

export async function exportVault(patientId: string) {
  const [profile] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, patientId));
  const bundle = await assembleBundle(patientId, null, new Date());
  return { patient: profile ?? null, ...bundle, exportedAt: new Date().toISOString() };
}

/**
 * Flow A, single step: patient picks a scope and gets a share code back
 * immediately — no OTP-confirm round trip. The code's own entropy (13
 * Crockford Base32 chars, ~65 bits — see generateShareCode) is what stands
 * in for the account-holder proof the OTP used to provide; there's no
 * "prove it's really you clicking this" gate anymore, only "you're already
 * logged in." That tradeoff is deliberate, not an oversight — see
 * docs/designs/vault-share-trd.md §4's addendum.
 *
 * No time-based expiry either (removed 2026-08-23): a share stays valid
 * until revoked or replaced. At most one active share per patient — creating
 * a new one revokes any currently-active grant first, in the same call, so
 * "replaced on regenerate" can never leave two codes live at once.
 */
export async function createShare(
  patientId: string,
  scope: VaultShareScope
): Promise<{ shareCode: string }> {
  const now = new Date();
  const { scopeFrom, scopeTo } = resolveScope(scope, now);

  await db
    .update(vaultShareGrants)
    .set({ status: "revoked", revokedAt: now })
    .where(and(eq(vaultShareGrants.patientId, patientId), eq(vaultShareGrants.status, "active")));

  const bundle = await assembleBundle(patientId, scopeFrom, scopeTo);
  // plaintextKey is used once, right here, and never stored or returned —
  // best-effort discard (garbage collected once out of scope); Node has no
  // guaranteed secure-wipe for Buffers short of a dedicated library, which
  // is disproportionate for this build.
  const { plaintextKey, wrappedKey } = await generateDataKey();
  const bundleCiphertext = encryptBundle(JSON.stringify(bundle), plaintextKey);
  const shareCode = generateShareCode();

  await db.insert(vaultShareGrants).values({
    patientId,
    status: "active",
    scopeFrom,
    scopeTo,
    shareCodeHash: hashSecret(shareCode),
    wrappedDek: wrappedKey,
    bundleCiphertext,
  });

  return { shareCode };
}

export async function revokeShare(grantId: string, patientId: string): Promise<boolean> {
  const result = await db
    .update(vaultShareGrants)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(
      and(
        eq(vaultShareGrants.id, grantId),
        eq(vaultShareGrants.patientId, patientId),
        eq(vaultShareGrants.status, "active")
      )
    )
    .returning({ id: vaultShareGrants.id });
  return result.length > 0;
}

export interface VaultShareSummary {
  id: string;
  status: string;
  scope: ScopeSummary;
  createdAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
}

export async function listShares(patientId: string): Promise<VaultShareSummary[]> {
  // Every grant is created already-active (no pending/unconfirmed state to
  // filter out anymore — see createShare above), so this is a plain list.
  const grants = await db
    .select()
    .from(vaultShareGrants)
    .where(eq(vaultShareGrants.patientId, patientId))
    .orderBy(desc(vaultShareGrants.createdAt));

  if (grants.length === 0) return [];

  const grantIds = grants.map((g) => g.id);
  const logRows = await db
    .select({ grantId: vaultShareAccessLog.grantId, viewedAt: vaultShareAccessLog.viewedAt })
    .from(vaultShareAccessLog)
    .where(
      and(inArray(vaultShareAccessLog.grantId, grantIds), eq(vaultShareAccessLog.outcome, "viewed"))
    );

  return grants.map((g) => {
    const views = logRows.filter((l) => l.grantId === g.id);
    const lastViewedAt = views.length
      ? views.reduce((latest, v) => (v.viewedAt > latest ? v.viewedAt : latest), views[0].viewedAt)
      : null;
    return {
      id: g.id,
      status: g.status,
      scope: scopeSummary(g.scopeFrom, g.scopeTo),
      createdAt: g.createdAt.toISOString(),
      revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
      lastViewedAt: lastViewedAt ? lastViewedAt.toISOString() : null,
      viewCount: views.length,
    };
  });
}

async function logAccess(
  grantId: string,
  outcome: "viewed" | "invalid_code" | "expired_attempt",
  meta: { ipHash: string | null; userAgentCoarse: string | null }
) {
  await db.insert(vaultShareAccessLog).values({
    grantId,
    outcome,
    viewerIpHash: meta.ipHash,
    viewerUserAgentCoarse: meta.userAgentCoarse,
  });
}

export type RedeemResult =
  | ({ ok: true; patientName: string; scope: ScopeSummary } & VaultBundle)
  | { ok: false; reason: "not_found" | "expired" };

/**
 * The public, no-session redeem path (Rules.md #11's second named exception).
 * Looked up by exact hash match only — no `status` filter in the query, so a
 * revoked/expired code can still be found and logged distinctly from a code
 * that never existed at all.
 */
export async function redeemShareCode(
  code: string,
  meta: { ipHash: string | null; userAgentCoarse: string | null }
): Promise<RedeemResult> {
  const hash = hashSecret(code);
  const [grant] = await db.select().from(vaultShareGrants).where(eq(vaultShareGrants.shareCodeHash, hash));

  if (!grant) {
    return { ok: false, reason: "not_found" };
  }

  if (grant.status === "revoked") {
    await logAccess(grant.id, "expired_attempt", meta);
    return { ok: false, reason: "expired" };
  }

  if (!grant.wrappedDek || !grant.bundleCiphertext) {
    return { ok: false, reason: "not_found" };
  }

  const dek = await unwrapDataKey(grant.wrappedDek);
  const bundle = JSON.parse(decryptBundle(grant.bundleCiphertext, dek)) as VaultBundle;
  const [patient] = await db.select({ name: user.name }).from(user).where(eq(user.id, grant.patientId));

  await logAccess(grant.id, "viewed", meta);

  return {
    ok: true,
    patientName: patient?.name ?? "Patient",
    scope: scopeSummary(grant.scopeFrom, grant.scopeTo),
    prescriptions: bundle.prescriptions,
    consultNotes: bundle.consultNotes,
    addedRecords: bundle.addedRecords,
  };
}
