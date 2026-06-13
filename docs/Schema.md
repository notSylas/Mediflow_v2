# MediFlow v2 — Database Schema

Source of truth: `src/db/schema.ts` (Drizzle). Dev DB: Docker `mediflow-v2-pg`, Postgres 17, port **5433**. Apply changes with `npm run db:push`.

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

- **user** — `id` (text PK), `name`, `email` (unique), `emailVerified`, `image`, **`role`** (`patient` default | `doctor`), `phone`, timestamps.
- **session / account / verification** — standard Better Auth; sessions cascade on user delete.

## Domain tables

### doctor_profiles
One row per doctor (one row in practice; multi-doctor ready). `userId` (unique FK→user), `specialty`, `bio`, **`feeInPaise`** (integer — money is always paise), `slotMinutes` (default 20), `timezone` (default `Asia/Kolkata`).

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
Patient uploads (pdf/jpg/png, size-capped in `src/lib/reports.ts`). `patientId` FK (cascade), optional `appointmentId` (set-null), `filename`, `mimeType`, **`data` bytea** — stored inline; a single-doctor app doesn't need object storage. Revisit if files grow.

## Conventions

- PKs: `uuid` default random (domain), text (auth tables).
- All timestamps `timestamptz`; wall-clock fields (`time`, `date`) are doctor-timezone-local.
- Money: integer paise, never floats.
- Enums are Postgres enums (`pgEnum`) — adding a value is a migration.
- History queries (`src/lib/consult.ts`) rely on `prescriptions.patientId`/`doctorId` denormalization — keep them written on insert.
