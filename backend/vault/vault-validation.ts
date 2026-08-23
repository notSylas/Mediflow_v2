// Pure validation for the vault-record confirm step, kept free of DB access
// so it can be unit-tested directly — same split as vault-share-policy.ts.
//
// This is a general-purpose vault (any record type, any source, read years
// later by a doctor who wasn't there), so one baseline mandatory set applies
// to every recordType rather than a per-specialty schema. Medical data is
// never auto-trusted from an extraction pass — this only runs at the human
// confirm step, never before.

import type { VaultRecordPatch } from "./vault-records";

/** Empty array = valid. Non-empty = the confirm step must be blocked. */
export function validateVaultRecordPatch(patch: VaultRecordPatch): string[] {
  const errors: string[] = [];

  if (!patch.recordDate || !patch.recordDate.trim()) {
    errors.push("Add the date on the document.");
  }

  if (!patch.sourceFacility?.trim() && !patch.sourceDoctorName?.trim()) {
    errors.push("Add the hospital/clinic or the doctor's name.");
  }

  // Baseline clinical content is diagnosis/advice/medicines, same for every
  // type — plus one type-specific alternative, so a lab report with only lab
  // values (no prose diagnosis) or a vaccination with only vaccine details
  // isn't wrongly blocked.
  const hasMedicines = patch.medicines.length > 0;
  const hasTypeSpecificContent =
    (patch.recordType === "lab" && patch.labResults.length > 0) ||
    (patch.recordType === "vaccination" && Boolean(patch.vaccineDetails?.vaccineName?.trim())) ||
    (["scan", "discharge_summary", "other"].includes(patch.recordType) &&
      Boolean(patch.findings?.trim()));
  if (
    !patch.diagnosis?.trim() &&
    !patch.advice?.trim() &&
    !hasMedicines &&
    !hasTypeSpecificContent
  ) {
    errors.push("Add a diagnosis, advice, or at least one medicine.");
  }

  if (patch.medicines.some((m) => !m.name.trim())) {
    errors.push("Every medicine needs a name.");
  }

  return errors;
}
