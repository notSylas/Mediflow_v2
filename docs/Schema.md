# MediFlow v2 — Database Schema

Source of truth: `backend/db/schema.ts` (Drizzle). Dev DB: Docker `mediflow-v2-pg`, Postgres 17, port **5433**. Apply changes with `npm run db:push`.

## Entity map

```
user ─1:1─ doctor_profiles ─1:N─ availability_rules
  │              │          ─1:N─ availability_overrides
  │              └─────1:N─ appointments ─1:1─ payments
  │                              │       ─1:1─ consult_notes
  └────────1:N (as patient)──────┘       ─1:1─ prescriptions ─1:N─ prescription_medicines
  └────────1:N─ medical_reports ──N:1 (optional)─ appointments
```

## Auth tables (Better Auth shape)

- **user** — `id` (text PK), `name`, `email` (unique), `emailVerified`, `image`, **`role`** (`patient` default | `doctor` | `admin`), `phone`, timestamps. Plain text column, not a pg enum — see `backend/auth/roles.ts` for the shared TS type, and `scripts/promote-admin.ts` for how the (self-service-less) `admin` role gets granted.
- **session / account / verification** — standard Better Auth; sessions cascade on user delete.

## Domain tables

### doctor_profiles
One row per doctor (one row in practice; multi-doctor ready). `userId` (unique FK→user), `specialty`, `bio`, **`feeInPaise`** (integer — money is always paise), `slotMinutes` (default 20), `timezone` (default `Asia/Kolkata`).

RMP verification fields, added 2026-07-06 as dormant "Phase 1 marketplace" scaffolding and activated 2026-08-26 by `backend/people/doctor-verification.ts`: `registrationNo`, `stateMedicalCouncil`, `yearOfRegistration`, `systemOfMedicine` enum (`allopathy`/`homeopathy`/`ayurveda`), `hprId` (ABDM Healthcare Professionals Registry ID, string only), `verificationStatus` enum (`unverified`/`pending`/`verified`/`rejected`/`suspended`), `verifiedAt`, `verifiedByUserId` (FK→user, set-null), `verificationNotes`, `isListed` (still unused — discovery/marketplace listing is future work). Verification is entirely manual: an admin cross-checks the submitted registration number against NMC's public Indian Medical Register themselves — no automated NMC/HPR API integration.

### availability_rules
Weekly recurring template. `doctorId` FK, `weekday` (0=Sun…6=Sat), `startTime`/`endTime` (time). Slot duration comes from the profile.

### availability_overrides
Date exceptions. `date`, `kind` (`blocked` | `extra`), optional `startTime`/`endTime`, `reason`.

### appointments
`doctorId` FK, `patientId` FK→user, `startsAt`/`endsAt` (timestamptz), `status` enum (`pending_payment`, `confirmed`, `completed`, `cancelled`, `no_show`), `intakeNote` (visit reason + symptoms), `videoRoom`, `holdExpiresAt`, timestamps.

**The most important line in the schema** — double-booking prevention:
```sql
CREATE UNIQUE INDEX uq_appointments_doctor_slot
  ON appointments (doctor_id, starts_at) WHERE status <> 'cancelled';
```
Booking code must cancel expired `pending_payment` holds for a slot before inserting into it (see `/api/appointments` POST).

### payments
1:1 with appointment (`appointmentId` unique FK, cascade). `provider` (default `razorpay`), `orderId`, `paymentId`, `amountInPaise`, `currency` (`INR`), `status` enum (`created`, `paid`, `failed`, `refunded`).

### consult_notes
1:1 with appointment. SOAP sections: `subjective`, `objective`, `assessment`, `plan` (all nullable text). Matches v1's encounter structure and the planned AI-scribe output format.

### prescriptions
1:1 with appointment. `patientId`, `doctorId` (denormalized FKs for history queries), `diagnosis`, `advice`, `status` enum (**`draft` | `issued`** — issued is permanently locked), `validUntil` (date), `issuedAt`.

### prescription_medicines
N per prescription (cascade). `name` (required), `strength`, `route`, timing flags `morning`/`afternoon`/`evening`/`night`, `foodRelation`, `durationDays`, `instructions`, `sortOrder`.

### medical_reports
Patient uploads (pdf/jpg/png, size-capped in `backend/consult/reports.ts`). `patientId` FK (cascade), optional `appointmentId` (set-null), `filename`, `mimeType`, **`data` bytea** — stored inline; a single-doctor app doesn't need object storage. Revisit if files grow.

### doctor_verification_documents
Documents a doctor submits for RMP verification — `doctorId` FK→doctor_profiles (cascade), `kind` enum (`identity`/`degree`/`registration`/`hpr`; `degree` reserved, unused by the current flow, which only requires `identity`+`registration`, `hpr` optional), `filename`, `mimeType`, **`data` bytea** — same inline-storage convention as `medical_reports`. At most one row per `(doctorId, kind)`: `backend/people/doctor-verification.ts`'s `upsertVerificationDocument` deletes-then-inserts, so a re-upload replaces rather than duplicates, no history kept.

### vault_records (Vault Tier 2 — added post-v1, `backend/vault/`)
A record from *any* doctor/hospital, not just MediFlow's own — `patientId` FK (cascade), `recordType` enum (`prescription`/`lab`/`scan`/`discharge_summary`/`vaccination`/`other`), `recordDate`, free-text `sourceFacility`/`sourceDoctorName` (deliberately not a FK — generic by design), `diagnosis`/`diagnosisCode`/`advice`/`medicines` (jsonb), plus original file (`data` bytea) and extraction status. `patientConfirmed` gates whether it counts toward the vault timeline or a share bundle — nothing here is trusted from extraction alone.

Generic, FHIR/ABDM-aligned fields (all nullable, type-specific by convention — see `docs/designs/vault-share-trd.md`'s field-mapping table): `vitals` (jsonb — BP/pulse/temp/SpO2/weight/height; prescription, discharge_summary), `labResults` (jsonb array — testName/value/unit/referenceRange/flag; lab), `findings` (text; lab/scan/discharge_summary/other), `admissionDate` (date; discharge_summary — `recordDate` is that type's discharge date), `vaccineDetails` (jsonb — vaccineName/doseNumber/batchNumber/route/site/nextDueDate; vaccination).

### vault_record_edits
Append-only audit trail (cascade from `vault_records`) — one row per save that actually changes a field, `changedFields` (jsonb string array) + `previousValues` (jsonb) so any field's pre-edit value is provable later. The transparency/liability record behind the "edited by patient" flag shown in a share.

## Conventions

- PKs: `uuid` default random (domain), text (auth tables).
- All timestamps `timestamptz`; wall-clock fields (`time`, `date`) are doctor-timezone-local.
- Money: integer paise, never floats.
- Enums are Postgres enums (`pgEnum`) — adding a value is a migration.
- History queries (`backend/consult/consult.ts`) rely on `prescriptions.patientId`/`doctorId` denormalization — keep them written on insert.
