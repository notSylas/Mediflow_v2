# MediFlow — Master Product Plan

**Single source of truth for product vision, scope, and roadmap.** When any feature
doc disagrees with this file on scope or sequencing, this file wins. Individual
design docs hold the detail; this file holds the shape. Last updated: 2026-07-05.

---

## 1. Vision

A **report-first, multi-doctor telemedicine platform** for India that wins on
**quality and continuity**, not marketplace scale. The patient uploads a medical
report, AI surfaces the red flags, the product recommends a matched doctor with a
plain-English "why," they consult by video, and every record lands in a health
vault they keep for life. The differentiator vs Practo / Apollo / 1mg: those put a
search box at the front door and optimize for doctor supply, which erodes consult
quality — MediFlow inverts it (report → matched doctor) and never loses a record.

**The moat:** report-triage matching + longitudinal continuity (vault + timeline).
Incumbents treat records as lock-in; MediFlow treats them as the patient's portable
property.

## 2. Where we are (honest status)

- **Pre-launch.** Single-doctor v1 is ~built (booking, pay-at-booking, video,
  SOAP + prescription, chat, care-subscription scaffolding, mobile app). See
  [Tracker.md](Tracker.md).
- **Zero real paid bookings.** Launch blockers still open: Resend emails, production
  deploy, doctor seed.
- **Deployment:** local-first (Docker Postgres + MinIO) now → cloud (S3/R2 + same
  code, env-flip) later.
- Reviews done this cycle: CEO (Approach C), Design (triage+booking, 9/10), Eng
  (architecture locked, 2 decisions open).

## 3. Settled policy reversals (on record — these override older docs)

1. **AI features are IN.** The old "no AI in initial stages" fence (from the original PRD, now folded into §8) is
   **reversed**: AI report-triage and doctor-authored AI scribe are core to the
   plan. (AI never prescribes independently — India Telemedicine Guidelines 2020;
   doctor authors and signs.)
2. **Records vault is IN.** The old PRD "records vault — cut" is **reversed**: the
   health timeline + medical vault are headline features. See
   [medical-vault.md](designs/medical-vault.md).
3. **Multi-doctor is IN** as the platform direction, sequenced after single-doctor
   validation (see roadmap).
4. **Messaging gate:** active MediFlow Care subscription is the only durable
   messaging gate. One-off paid consultations do not unlock ongoing chat.

## 4. Unified roadmap (ONE sequence — supersedes the per-doc vocabularies)

Everything below is gated on the phase before it. "Validated" = ~5 real paid bookings.

```
PHASE 0 — LAUNCH (single doctor)          [gate: nothing — do this now]
  Resend emails · production deploy · doctor seed
  + selective delight (WhatsApp confirm, weekly digest, Rx PDF+QR, .ics)  [launch-readiness doc]
        │  gate: ~5 real paid bookings
        ▼
PHASE 1 — MARKETPLACE FOUNDATIONS (Wave A) [no AI]
  Multi-doctor data model · doctor self-signup + RMP verification (layered manual)
  · specialty taxonomy as data · system-of-medicine filter · manual doctor search
  · public profiles · ratings/reviews · admin/ops console + audit logs
  Payouts: invite-only doctors settled manually; Razorpay Route deferred to 2nd paying doctor
        │  gate: marketplace working + demand proven
        ▼
PHASE 2 — AI REPORT-TRIAGE (Wave B)        [the differentiator]  [triage-booking-flow-design doc]
  Report upload → structured OCR → LLM red-flag analysis → deterministic urgent-flag
  (authoritative) → matching engine ("why this doctor") → dual-entry booking
  Degrade-to-manual on any AI failure · async via graphile-worker · report storage (S3/MinIO)
        │  gate: triage trusted + used
        ▼
PHASE 3 — CONTINUITY (Wave C)              [continuity moat]  [medical-vault doc]
  Health timeline · medical vault Tier 1 (auto-capture) + Tier 2 (upload + OCR-tag)
  · doctor-authored AI scribe (SOAP + patient summary; Rx-draft still open)
        │  gate: scale + capital
        ▼
PHASE 4 — PLATFORM (deferred, post-scale)
  ABDM/ABHA interop (portable records) · Razorpay Route payouts · e-pharmacy (licensed)
  · genome/pharmacogenomics · regional-language triage for tier 2/3
```

Cross-cutting, present from Phase 1 on: **DPDP compliance** (consent, retention,
export/deletion), **observability** (AI failure/OCR-confidence/booking metrics),
**IDOR-scoped access**, **prompt-injection defense** (structured values only).

## 5. Feature doc index (the detail lives here)

| Area | Doc | Phase |
|---|---|---|
| Launch + selective delight | [launch-readiness-and-expansion.md](designs/launch-readiness-and-expansion.md) | 0 |
| Care subscription | [care-subscription-plan.md](designs/care-subscription-plan.md) | 0/1 |
| Triage + booking flow (design, 9/10) | [triage-booking-flow-design.md](designs/triage-booking-flow-design.md) | 1–2 |
| Medical vault | [medical-vault.md](designs/medical-vault.md) | 2–3 |
| Full UI mockups (all screens) | [mockups/index.html](designs/mockups/index.html) | all |
| CEO scope decisions | `~/.gstack/projects/notSylas-Mediflow_v2/ceo-plans/2026-06-29-*.md` | — |

## 6. NOT in scope (deferred, with reason)

- **E-pharmacy delivery** — separate licensed business; no notified India rules. Partner, don't build. (Phase 4)
- **Genome / pharmacogenomics** — sensitive data under DPDP; premature. (Phase 4)
- **ABDM/ABHA certification** — weeks of process, zero value pre-users. (Phase 4)
- **Razorpay marketplace payouts** — deferred until a 2nd paying doctor exists.
- **Mobile native production build** — parked until web validates usage.

## 7. Open decisions (must resolve before their phase)

| # | Decision | Blocks | Lean |
|---|----------|--------|------|
| 1 | AI Rx-draft vs SOAP-only first | Phase 3 scribe | SOAP-only first (anchoring risk) |
| 2 | Doctor onboarding: invite-only vs public self-signup | Phase 1 | Invite-only first |
| 3 | Triage infra: async vs sync | Phase 2 | Async (decided in eng review) |
| 4 | Build-sequencing: gate Phase 2 AI on validated bookings? | Phase 1→2 | Yes, gate it |

---

## 8. v1 baseline — requirements as built (folded in from the retired PRD)

The single-doctor v1 that Phase 0 launches. Per-feature status: [Tracker.md](Tracker.md); flows + state machine: [AppFlow.md](AppFlow.md).

**Patient stories**
1. Sign in with email OTP (no passwords).
2. State the visit reason + symptoms + optional report upload at booking.
3. Pick a free slot and pay the fee at booking (the no-show fix).
4. Join the video consult from the appointment page (camera/mic pre-check).
5. See the prescription + outcome afterwards; retrieve all past prescriptions anytime.
6. Cancel within the allowed window (≥2h before start); reschedule a confirmed slot.

**Doctor stories**
1. Define weekly availability + date overrides (holidays / extra sessions).
2. See today's / upcoming appointments and a work queue of what needs attention.
3. Open an encounter: intake, attached reports, full returning-patient history.
4. Run the call, write a SOAP note, compose + **issue** a structured prescription (locked once issued).
5. Mark the appointment completed or no-show.

**Success criteria**
- A real patient can book → pay → consult → receive a prescription with zero manual intervention.
- Zero double-bookings (enforced by the DB unique index `uq_appointments_doctor_slot`, verified by tests).
- The doctor can run 5+ consecutive consults without leaving the appointments view.

**v1 non-goals** — see §6 for the full deferred list: marketplace dynamics, insurance billing, EHR interoperability. (AI scribe and the records vault were non-goals in the original PRD but are now **in** the roadmap per §3, sequenced to Phases 2–3.)
