# Medical Vault — patient-owned lifelong health record

Decided 2026-07-05. Scope: **Tier 1 + Tier 2** near-term; **headline feature** positioning.
ABDM/ABHA (Tier 3) deferred until post-launch with real users.

## Problem
In India, medical records are paper, scattered across clinics, and lost after the
consult. The next doctor starts blind → repeat tests, repeated history, wasted money.
This is a continuity problem, and continuity is the moat that beats one-off marketplaces.

## Positioning
Headline patient feature: **"Your lifelong health record — portable to any doctor."**
A reason to stay on MediFlow, not just a consult tool. Pairs with the report-triage
differentiator (uploaded reports feed both triage AND the vault).

## Scope (near-term)

### Tier 1 — Auto-capture (ships with Wave C timeline)
Every MediFlow consult automatically files into the patient's vault:
- Prescription (already stored, immutable)
- Doctor's note / consult summary
- Any report the patient uploaded for that consult
Organized by date + doctor. Zero patient effort. Solves "I lost my prescription."

### Tier 2 — Bring your paper in (reuses triage OCR)
- Patient uploads old reports / prescriptions (photo or PDF).
- The SAME structured-extraction OCR built for triage auto-tags them: type
  (lab / scan / Rx / discharge), date, key values (HbA1c, BP, etc.), doctor.
- Vault is searchable and trend-aware ("show my sugar over 2 years"), not a dumb folder.

## Deferred — Tier 3 (ABDM / ABHA), post-launch
- **Share with any doctor:** time-limited, consented, revocable share link (same
  mechanism as the pharmacy Rx QR) so a patient hands full history to any doctor,
  even off-platform.
- **ABDM-compliant PHR app:** link the patient's ABHA health ID and pull records
  from other hospitals/labs with consent; make MediFlow records portable to the
  national system. Turns the vault from a silo (incumbent lock-in) into the
  patient's portable property. Requires ABDM sandbox + certification (weeks of
  process, zero value pre-users — hence deferred).

## Architecture (extends the eng-review report-storage decision — no new structure)
```
reports (object store + reports table) ──┐
prescriptions (exists, immutable) ───────┼──▶ VAULT (per-patient, IDOR-scoped view)
consult notes (exists) ──────────────────┤       ├─ manual upload → OCR tag (reuses triage pipeline)
                                         │       ├─ search / filter / value trends
Tier 3: ABDM/ABHA (deferred) ────────────┘       ├─ share link (consented, time-limited, revocable)
                                                 └─ export / delete (DPDP right)
```
- Reuses: private object storage (MinIO local / S3 cloud), signed URLs, `reports`
  table + consent/retention columns, the triage OCR pipeline, IDOR-scoping pattern.
- **Pays down a compliance item:** "download my whole vault" IS the DPDP export/
  deletion workflow codex flagged in the eng review. One feature, two obligations met.
- New: a `vault_items` view/table unifying reports + prescriptions + notes per
  patient with type/date/value tags; upload-from-vault entry point; share-link tokens.

## Sequencing
- Tier 1 rides Wave C (timeline + auto-filing) — nearly free.
- Tier 2 rides the triage OCR (Wave B) — new entry point, same pipeline.
- Tier 3 (ABDM) parked until real users justify certification effort.

## Open / to design
- Vault UI screen (distinct from the P17 timeline: a library/filter view). Not yet mocked.
- Family/dependent records (one account holding a child's/parent's records) — likely a fast follow.
