---
status: SPEC — precise enough to build from. No code written against this yet.
Revised 2026-08-11: encryption model decided (§5a), founder chose to build
now rather than wait (see vault-share-prd.md §0/§10). This revision takes
the spec from conceptual to exact — field lists, API contracts, build
order — per the founder's explicit request to finalize the technical design
before any code gets written.
---
# Vault Share — Technical Requirements Document

Companion to [vault-share-prd.md](vault-share-prd.md). Extends the
"Architecture" section of [medical-vault.md](medical-vault.md). None of the
mechanics below are novel — the same shape (OTP/code-gated, time-limited,
encrypted record access) is prior art going back to 2011 and is live today
at Epic and Eka Care (business doc §2.1, §2.4). That doesn't change the
design; it changes what can honestly be claimed about it.

**Scope of this build, stated precisely up front:** Flow A (Anywhere Share)
only. Flow B (in-platform doctor request) is designed in §4.2 for the record
but **deferred, not built now** — see §4.2's note for why. Tier 2 (outside
uploads, OCR) stays deferred per the PRD. What ships is: a MediFlow patient
can share their existing MediFlow-native records (prescriptions, SOAP notes)
with any doctor, anywhere, via a code, encrypted at rest, time-limited,
revocable, logged.

## 1. Design principles carried over from the existing codebase

- **Computed, not materialized** (`Rules.md` #2). The vault timeline is a
  read-time aggregation across `prescriptions` and `consult_notes` — never a
  duplicated copy.
- **Ownership checked on every access** (`Rules.md` #12).
- **A second named public-access exception** — `Rules.md` #11 was amended
  2026-08-11 to add Flow A's public redeem route alongside the existing
  Rx-view-link exception. Already done; not a pending item.

## 2. Architecture overview

```
EXISTING (unchanged, read-only source)        NEW (this build)
prescriptions ──┐                             vault_share_grants
consult_notes ──┴─ read-time aggregation ──▶   vault_share_access_log
        │              (GET /api/v1/patient/vault)
        ▼
  Flow A: patient picks scope + duration
        │
        ▼
  self-OTP confirm (new lightweight mechanism,
  reuses Resend — NOT Better Auth's login-OTP
  internals, different purpose)
        │
        ▼
  server: assemble bundle → GenerateDataKey (KMS)
  → AES-256-GCM encrypt → store wrapped key + ciphertext
  → mint share code (shown once)
        │
        ▼
  doctor (no account): /vault/view + code
        │
        ▼
  server: verify code → KMS Decrypt → AES-GCM decrypt
  → render (never a raw file/JSON download by default)
```

Flow B is not in this diagram — see §4.2.

## 3. Data model — exact fields

Two new tables for this build. Naming and column conventions match
`backend/db/schema.ts` exactly (uuid PK default random, `text` FK to `user.id`,
`timestamp(withTimezone: true)`, `pgEnum` for fixed vocabularies).

### vault_share_grants

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | random | PK |
| `patientId` | text, FK→`user.id`, cascade | no | — | owner |
| `status` | enum: `pending_otp_confirmation`, `active`, `expired`, `revoked` | no | `pending_otp_confirmation` | state machine, §4.1 |
| `scopeFrom` | timestamptz | yes | — | null = no lower bound ("everything") |
| `scopeTo` | timestamptz | no | — | set at OTP-confirm time = now; bundle query never includes anything created after this, even if the grant stays active for days |
| `expiresAt` | timestamptz | yes | — | null while pending; set at confirm = now + chosen duration |
| `otpHash` | text | yes | — | hash of the 6-digit self-confirm OTP; cleared on confirm |
| `otpExpiresAt` | timestamptz | yes | — | confirm window, 5 minutes |
| `otpAttempts` | integer | no | `0` | lock the grant (→ `revoked`) past a small fixed cap, e.g. 5 |
| `shareCodeHash` | text | yes | — | hash of the human-facing code; unique index where not null |
| `wrappedDek` | bytea | yes | — | KMS `GenerateDataKey` ciphertext blob; set at confirm |
| `bundleCiphertext` | bytea | yes | — | AES-256-GCM output (nonce + tag + ciphertext); set at confirm |
| `createdAt` | timestamptz | no | now | |
| `revokedAt` | timestamptz | yes | — | |

Indexes: unique on `shareCodeHash` (partial, `WHERE shareCodeHash IS NOT NULL`) — a collision becomes a clean retry, not a silent code reuse.

**Revised during implementation:** no `shareCodeAttempts` column. It doesn't
map cleanly to a hash-lookup design — a wrong guess matches no row, so
there's no specific grant to attribute an attempt count to. The real defense
is the code space itself: 8 Crockford-Base32 characters is ~1.1 trillion
combinations, looked up by exact hash match — brute-forcing that online is
infeasible regardless of a per-grant cap. `otpAttempts` stays as designed;
that one's real (6 digits is only a million possibilities, genuinely
guessable without a cap).

**What's deliberately not here:** no `origin` column, no `createdByDoctorId`,
no `pending_patient_approval`/`declined` status values, no request-response
deadline column. Those are Flow B fields (§4.2) — omitted because Flow B
isn't being built, not because they were forgotten. Adding them later is a
migration, same as any other feature; no reason to carry unused columns now.

### vault_share_access_log

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | random | PK |
| `grantId` | uuid, FK→`vault_share_grants.id`, cascade | no | — | |
| `viewedAt` | timestamptz | no | now | |
| `outcome` | enum: `viewed`, `invalid_code`, `expired_attempt` | no | — | |
| `viewerIpHash` | text | yes | — | salted hash, never raw IP |
| `viewerUserAgentCoarse` | text | yes | — | browser family only, not the full UA string |

This table is what renders "Viewed by a doctor on Aug 11, 2:04 PM" in the
patient's UI, and is the record that answers a DPDP access-trail question if
one is ever asked.

### Not building now (reference only)

`vault_records` (Tier 2 external uploads) stays exactly as sketched in the
prior draft of this document — unchanged, still correct, just not part of
this build (blocked on the Phase 2 OCR pipeline, which doesn't exist yet).
`vault_retention_prefs` is **dropped entirely** — it was originally sketched
to hold a per-patient retention window, but the retention decision (indefinite,
no fixed wall — PRD §10 #1) means there's no preference to store. Retention
is uniform default behavior, not per-patient config; export and delete are
actions (§7), not stored state.

> **2026-08-23 update — Tier 2 built, and given a generic, FHIR/ABDM-aligned
> template.** The paragraph above is now historical: `vault_records` shipped
> (manual entry + a real Prescription Analyzer extraction pass, not the OCR
> pipeline originally sketched here), and this update extends it with fields
> shaped and named after **FHIR R4** (`Observation`, `DiagnosticReport`,
> `Immunization`, `Condition`) and **ABDM/NDHM** (India's FHIR-profiled
> health-data-exchange spec: `OPConsultRecord`, `DiagnosticReportRecord`,
> `ImmunizationRecord`, `DischargeSummaryRecord`) — semantics and structure
> only, not a full FHIR Bundle/Resource envelope or terminology-coded fields
> (no LOINC/SNOMED/ICD server; codes stay optional free text).
>
> | `vault_records` column | FHIR / ABDM element | Used by |
> |---|---|---|
> | `diagnosis` | `Condition.code.text` | prescription, discharge_summary |
> | `diagnosisCode` | `Condition.code.coding` (free text, unvalidated) | prescription, discharge_summary — optional |
> | `vitals` (jsonb) | `Observation` (vital-signs category) | prescription, discharge_summary |
> | `labResults` (jsonb array) | `Observation[]` (laboratory category) — value/unit/referenceRange/interpretation | lab |
> | `findings` | `DiagnosticReport.conclusion` / discharge "course in hospital" | lab, scan, discharge_summary, other |
> | `admissionDate` | `Encounter.period.start` (`recordDate` is `Encounter.period.end`) | discharge_summary |
> | `vaccineDetails` (jsonb) | `Immunization` (vaccineCode, doseNumber, lotNumber, route, site, next-due) | vaccination |
>
> All new columns are nullable and additive — no migration touched existing
> rows. AI extraction (Prescription Analyzer) was deliberately left untouched
> this pass: the new fields are patient-fillable on the review screen only.
> The share bundle (`assembleBundle` in `vault-share.ts`) carries all of them
> through, so a receiving doctor on `/vault/view` sees the same structured
> data as the patient's own record page — see `backend/vault/vault-records.ts`
> and `backend/api/v1/vault.ts` for the exact shapes.

## 4. OTP + consent mechanics

> **2026-08-23 update — OTP step removed.** The two-step
> create-then-OTP-confirm flow described below (§4.1 steps 1–2) no longer
> matches the code. `POST /api/v1/patient/vault/share` now does everything
> in one call — assembles, encrypts, and returns the share code immediately,
> no email round trip. `vault_share_grants.status` dropped
> `pending_otp_confirmation`; the `otpHash`/`otpExpiresAt`/`otpAttempts`
> columns are gone. To compensate for losing the OTP's "prove it's really
> the account holder, not just a logged-in device" guarantee, the share
> code itself grew from 8 to 13 Crockford Base32 characters (~40 bits →
> ~65 bits) — see `backend/vault/vault-share-policy.ts`. This section is
> kept as-is below for historical context (why OTP existed, what it was
> for); it does not describe current behavior.

> **2026-08-23 update — time-based expiry removed.** `expiresAt`/duration
> (2h/24h/7d) is gone too. A share now stays valid indefinitely until the
> patient revokes it or creates a replacement — `createShare()` revokes any
> existing `active` grant for the patient in the same call before inserting
> the new one, so at most one share is ever active at a time. The
> `vault_share_grants.status` enum dropped `expired`; only `active | revoked`
> remain, and both a manual revoke and an automatic replace-on-regenerate
> land in `revoked` (not distinguished from each other — the share history
> list doesn't need to tell them apart). `expires_at` column dropped.

### 4.1 Flow A — Anywhere Share (this build)

State machine on a single `vault_share_grants` row:
`pending_otp_confirmation → active → (expired | revoked)`.

1. **`POST /api/v1/patient/vault/share`** — patient submits scope
   (`everything` or `last_6_months`) and duration (one of `120`, `1440`,
   `10080` minutes — 2h / 24h / 7d, an explicit allowlist, not arbitrary
   input). Server inserts a `pending_otp_confirmation` row with `scopeFrom`
   resolved from the preset, generates a 6-digit numeric OTP, stores its
   hash + a 5-minute `otpExpiresAt`, and sends it by email.
   - **Email mechanism, precisely:** a new, lightweight action-confirmation
     OTP — reuses the Resend integration (`backend/notifications/email.ts`) and its
     console-fallback-in-dev behavior (`Rules.md` #6), but is **not** a call
     into Better Auth's login-OTP internals. Login-OTP authenticates a
     session; this confirms a specific sensitive action from an
     already-authenticated session — different purpose, kept as its own
     small mechanism rather than force-fit into the auth library's flow.
2. **`POST /api/v1/patient/vault/share/confirm`** — submits `{ grantId, otp
   }`. Server checks hash match, expiry, and `otpAttempts < 5` (else the
   grant flips to `revoked` and the patient must start over — no infinite
   guessing). On success:
   - Sets `scopeTo = now`.
   - Queries `prescriptions` + `consult_notes` for this patient within
     `[scopeFrom, scopeTo]` and assembles a structured JSON bundle
     (diagnosis, medicines, SOAP text, dates, doctor name — **not** raw
     attached files, see §5).
   - Calls KMS `GenerateDataKey` once — this single call returns both a
     plaintext DEK (used immediately, then discarded) and that same key
     already wrapped by the account's master key. One round trip, the
     standard AWS envelope-encryption pattern, not a locally-generated key
     followed by a separate `Encrypt` call.
   - Encrypts the bundle with the plaintext DEK, AES-256-GCM. Stores the
     wrapped DEK and the ciphertext. Discards the plaintext DEK.
   - Generates the share code: 8 characters, Crockford Base32 alphabet
     (excludes visually ambiguous `0/O/1/I/L` — it has to be read aloud and
     copied correctly by a non-technical patient), `crypto.randomBytes`
     sourced. Stores only its hash. ~40 bits of entropy — deliberately not
     password-grade, because the security model here is short expiry +
     rate-limited attempts, the same reasoning that makes a 6-digit login
     OTP acceptable despite its own low raw entropy.
   - Sets `status = active`, `expiresAt = now + durationMinutes`.
   - Returns the **plaintext code once** — never logged, never re-fetchable
     after this response.
3. **`POST /api/v1/vault/redeem`** (public, no session) — submits `{ code
   }`. Server hashes the input, looks up a matching, non-expired,
   non-revoked grant, checks `shareCodeAttempts < 10` (else lock the
   grant), plus a coarse IP-based rate limit on the endpoint overall
   (independent of any single grant, to blunt distributed guessing across
   many codes). On a match: KMS `Decrypt` on the wrapped DEK → AES-GCM
   decrypt the bundle → render server-side HTML (never handed back as raw
   JSON or a file) with a visible countdown and a watermark (patient name +
   share timestamp) → log the view to `vault_share_access_log`. Every
   redemption re-decrypts fresh; nothing plaintext is cached between views.
4. **Attachments — dropped from this build, not just deferred in priority.**
   The bundle (§3) only ever contains prescriptions and consult notes; it
   never references an original file, so there's nothing yet for an
   attachment endpoint to serve. Revisit once Tier 2 actually puts a file
   reference into the bundle — at that point, reuse the share code itself as
   the credential (one check, not a second signed-URL scheme), same
   reasoning as before, just not built ahead of having anything to attach.
5. **`POST /api/v1/patient/vault/share/[id]/revoke`** — patient-owned,
   ownership-checked. Sets `revoked` immediately; the next redeem attempt
   (even with the right code) fails. Cannot un-render a page already open
   in a browser — no comparable product can either (TRD threat model, §9).

### 4.2 Flow B — deferred, not part of this build

Designed in the prior draft, kept here for reference, **not being built
now**: the reasoning changed, not just the priority. Flow B grants a
MediFlow doctor access to a patient's *outside* records. But MediFlow has
one doctor. That doctor already sees their own patient's full MediFlow
history unconditionally today (the existing returning-patient panel, no
grant needed) — there is no second MediFlow doctor to request access *from*.
Building Flow B now would be real engineering effort spent on a scenario
(cross-doctor referral within MediFlow) that has no user until multi-doctor
ships. Revisit at that point; nothing in §3's schema blocks adding it later
as a migration.

## 5. Encryption architecture

Two layers, kept explicitly separate — expanded on in §5a below.

**Layer 1 — baseline at-rest hardening.** `docs/qa/
ProductionReadinessBacklog.md` item B2 already flags this as an open,
feature-independent gap. Not a prerequisite for this build.

**Layer 2 — per-grant envelope encryption (this build).** One KEK, held in
a managed KMS (AWS KMS — the concrete choice per PRD §0 #9, since the
current stack, Vercel + Neon, has no native KMS and one had to be picked).
Per grant: a fresh DEK from `GenerateDataKey` (§4.1 step 2), AES-256-GCM for
the bundle, discard the plaintext DEK immediately after use, every KMS
`Decrypt` call independently logged by AWS CloudTrail — a second audit
trail outside MediFlow's own database.

**Deletion is crypto-shredding.** Revoking or expiring a grant, or a
patient's account-level erasure request, only needs to delete the
`vault_share_grants` row — the ciphertext becomes meaningless without the
wrapped key, including in any database backup or snapshot that might still
hold the encrypted bytes. Standard technique, not a shortcut — it's what
makes the DPDP erasure right practically deliverable without a
backup-purging project.

**Key rotation:** KMS-managed automatic annual rotation for the KEK — the
pragmatic v1 posture at this scale. DEKs are single-use per grant by
construction; there's nothing to "rotate" at that layer, only to discard.

## 5a. Three layers, kept explicitly separate

**Decided 2026-08-11 (founder confirmed):** server-side access with strong
controls — MediFlow's server can technically read vault data, which is what
lets it render views and (later) run OCR and build trend graphs, protected
by envelope encryption, KMS-gated key access, and full audit logging (§4/§5
as written). **Not** true end-to-end encryption — that alternative would
break the server-rendered doctor view entirely, since the doctor's browser
would need to decrypt client-side, which requires the real key to reach an
anonymous, never-signed-up recipient — a problem no comparable product (Epic
Share Everywhere, Apple Health Records, Eka Care) has actually solved for
this exact "hand a code to a stranger" scenario either. This decision is
final for design purposes; §4/§5 are settled architecture, not a proposal.

Worth restating plainly, since it's the most common source of confusion in
a design like this: **transit encryption** (ordinary TLS, automatic, not
discussed further), **at-rest encryption** (§5 — protects the database from
theft), and **authorization** (§4 — the OTP and share code) are three
different things. The share code is an access-control gate, never the
encryption key itself.

## 6. Extraction / OCR pipeline

Unchanged from the prior draft — Tier 2 territory, blocked on the Phase 2
OCR pipeline, not part of this build. See the prior revision's reasoning on
purpose-built OCR APIs vs. general vision-model extraction; nothing here
changes that.

## 7. API surface — exact contracts

All new, under `/api/v1/*` per `Rules.md` #12's namespace convention, except
the two public routes.

### Patient (session required, ownership-checked)

**`GET /api/v1/patient/vault`**
Response `200`: `{ items: Array<{ id, type: "prescription" | "consult_note", date, doctorName, summary }> }`. No `trends` field in this build — trend charts need structured numeric values (HbA1c, BP) that only exist once Tier 2/OCR lands; shipping an empty or fake trend strip now would be worse than not having one.

**`POST /api/v1/patient/vault/share`**
Body: `{ scope: "everything" | "last_6_months", durationMinutes: 120 | 1440 | 10080 }`.
Response `200`: `{ grantId, otpSentTo: string (masked email) }`.
Errors: `400` invalid scope/duration; `429` if called too many times in a short window (basic abuse guard).

**`POST /api/v1/patient/vault/share/confirm`**
Body: `{ grantId, otp: string }`.
Response `200`: `{ grantId, shareCode: string, qrPayload: string (full `/vault/view` URL with the code), expiresAt: string }`.
Errors: `400` wrong/expired OTP; `409` grant already confirmed or revoked (attempts exhausted).

**`POST /api/v1/patient/vault/share/[id]/revoke`**
Response `200`: `{ status: "revoked" }`. `403` if the grant isn't this patient's. `409` if already expired/revoked.

**`GET /api/v1/patient/vault/share`**
Response `200`: `{ grants: Array<{ id, status, scope: { from, to }, createdAt, expiresAt, revokedAt, lastViewedAt, viewCount }> }` — `lastViewedAt`/`viewCount` computed by joining `vault_share_access_log`, not stored (consistent with §1's "computed, not materialized").

**`GET /api/v1/patient/vault/export`**
Response `200`: a downloaded JSON file — `{ patient, prescriptions, consultNotes }`. JSON, not a formatted PDF, for this build — satisfies the DPDP export right; a nicer print/PDF view is a later polish pass, not a requirement to ship this.

### Public (no session — the `Rules.md` #11 exception)

**`GET /vault/view`** — page, not an API route. Code-entry form; if the URL carries `?code=`, pre-fills and auto-submits.

**`POST /api/v1/vault/redeem`**
Body: `{ code: string }`.
Response `200`: rendered view data — `{ patientName, scopeLabel, expiresAt, items: [...] }` (server also serves the actual HTML page; this is the data contract if rendered client-side, or this endpoint can directly return HTML — implementation detail, not a design fork).
Errors: `404` no matching grant; `410` expired; `423` locked (too many failed attempts on this grant); `429` IP-level rate limit.

(No attachment route in this build — see §4.1 step 4.)

## 8. Retention & sweep job

Simplified given §3's dropped `vault_retention_prefs`: there is no
per-patient retention config to enforce. The only scheduled work this
feature needs is a nightly sweep flipping any `active` grant past
`expiresAt` to `expired` — belt-and-suspenders on top of the redeem-time
check (§4.1 step 3), not a substitute for it. Account-level export/erasure
(§5's crypto-shredding) is triggered by the patient, not a cron job.

## 9. Threat model

Unchanged from the prior draft in substance; two entries refined for
precision:

| Threat | Mitigation |
|---|---|
| Share code guessed/brute-forced | Per-grant attempt cap (`shareCodeAttempts < 10`, then lock) **plus** a coarse per-IP rate limit on `/api/v1/vault/redeem` overall — two layers, since a per-grant cap alone doesn't stop someone spraying guesses across many different grants |
| Database dump / backup theft | Bundle ciphertext meaningless without a live KMS `Decrypt` call, IAM-scoped and CloudTrail-logged independent of MediFlow's own logs |
| MediFlow misclassified as a DPDP Consent Manager | Vault Share only mediates consent for MediFlow's own held data, direct patient-to-recipient — never a third party's data relayed on the patient's behalf |

(Remaining rows — over-broad sharing, screenshot-after-expiry, patent/FTO —
unchanged from the prior draft, still accurate.)

## 10. Regulatory posture

Unchanged from the prior draft — still accurate, not repeated here.

## 11. Remaining open engineering decisions

Most of what was open here is now resolved (encryption model §5a, `Rules.md`
#11 amendment already made, build order settled by §4.2's Flow B deferral).
What's left:

1. **KMS account creation** — a real AWS account with billing needs to
   exist before Wave 1 (§12) can be built against it. Not a design
   question, an action item on the founder (PRD §0 #9).
2. **Rate limiter implementation for `/api/v1/vault/redeem`** — confirm
   whether the existing auth rate-limiting infra (`Rules.md` #24,
   `DISABLE_RATE_LIMIT` for tests) extends cleanly to a non-auth public
   route, or whether this route needs its own limiter instance. Small,
   resolve during Wave 3 (§12), doesn't block starting Wave 1.

## 12. Build sequence

Staged so each wave is independently reviewable, matching the convention
`care-subscription-plan.md` and `launch-readiness-and-expansion.md` both
use — each wave its own PR.

**Wave 1 — schema + crypto plumbing, no user-visible surface**
`vault_share_grants` + `vault_share_access_log` in `schema.ts` → `db:push`.
A `backend/vault/vault-crypto.ts` module wrapping KMS `GenerateDataKey`/`Decrypt`
and the AES-256-GCM encrypt/decrypt helpers, pure-logic-tested per `Rules.md`
#19.

**Wave 2 — patient-side share creation + management**
`POST .../share`, `.../share/confirm`, `.../share/[id]/revoke`,
`GET .../share` (list). The action-confirmation OTP mechanism (§4.1 step 1).
Patient UI: vault home (`GET .../vault`) + the share-creation flow (PRD
§7.1, §7.3).

**Wave 3 — public redeem**
`/vault/view` page, `POST /api/v1/vault/redeem`, the attachment route.
Resolve the rate-limiter question (§11 #2) here.

**Wave 4 — export + sweep**
`GET .../vault/export`, the nightly expiry-sweep cron (mirrors the existing
`cron/reminders` pattern).

**Wave 5 — polish**
Access-log UI on the patient side ("Viewed by a doctor on…"), the
countdown/watermark on the redeemed view, empty/error states per PRD §7.5.

Flow B (§4.2) and Tier 2 (§6) are not waves in this sequence — revisit each
independently when their respective preconditions (multi-doctor; Phase 2
OCR) are met.
