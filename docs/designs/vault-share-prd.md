---
status: DRAFT — revised after a prior-art / live-market research pass; see §2
---
# Vault Share — Product Requirements Document

Authored 2026-08-11, revised same day. Extends
[medical-vault.md](medical-vault.md), specifically its Tier 3 ("share with
any doctor") which that doc explicitly left as **"Open / to design."** This
document is that design, expanded to cover the full loop the founder
described: extract a prescription → store it in a structured vault → retain
it for the long term → share it with any doctor, anywhere, under the
patient's control, encrypted end to end.

Companion docs: [vault-share-trd.md](vault-share-trd.md) (architecture,
encryption, OTP mechanics), [vault-share-business.md](vault-share-business.md)
(market, competitors, monetization, and — read this one first — a full
prior-art and live-market reality check).

---

> **Scope confirmed with the founder (2026-08-11):** vault creation stays
> gated to patients who've had a MediFlow consult — not opened as a public,
> standalone signup. This protects the Tier 1 "tethered to a real visit"
> pattern that avoided the Google Health/Microsoft HealthVault failure mode
> (business doc §2.3). The doctor side of Flow A is confirmed exactly as
> designed below: any doctor, anywhere, no MediFlow account, receiving a
> one-off time-limited view via a code — already the intended design, raised
> and re-confirmed, not a change.

## 0. Founder inputs needed before this moves to build

Consolidated from the open items scattered across this doc, the TRD, and the
business doc — one checklist instead of three. Each has a recommendation
already made; what's needed is a confirm or an override, plus a few items
that are real legwork, not decisions.

**Decisions (confirm or override a standing recommendation)**
1. ~~Retention~~ — **DECIDED 2026-08-11:** indefinite + patient-controlled
   delete, no fixed wall (§10 #1).
2. ~~Timing~~ — **DECIDED 2026-08-11:** build now, in parallel with the push
   for the first real bookings — founder explicitly overrode the
   wait-for-the-gate recommendation (§10 #2). The risk reasoning in §10 and
   business doc §7 stays on record for build-time risk-awareness, but is no
   longer the operative plan.
3. Tier 2 (manual old-record upload): hold until Tier 1 + Flow A show real
   usage (§10 #6) vs build it alongside anyway.
4. ~~Monetization shape~~ — **DECIDED 2026-08-11:** deferred. Ship the
   feature access-open (no paywall) for now; pricing model chosen later
   once there's usage to price against (business doc §8).
5. Self-confirm OTP channel: email-only to start (§10 #4) vs SMS from day one.
6. Patient-facing name — "Vault Share" is a working title used throughout
   these docs, not a final product name.

**Legwork only you can start (not a decision, an action)**
7. Commission a real patent freedom-to-operate opinion from a patent
   attorney (business doc §2.1, TRD §11 #5) before this ships beyond a small
   pilot — I can help draft what to ask counsel, can't substitute for one.
8. Get actual OCR vendor pricing (Veryfi, Lido, or similar) before any
   freemium upload limit is set (business doc §9) — vendor accuracy claims
   found in research are marketing, not quotes.
9. Pick and set up a KMS cloud account — AWS or GCP (TRD §11 #1). Neither
   Vercel nor Neon (your current stack) provides this; it's a new vendor
   relationship and a new bill.
10. Line up a small real-user pilot: a non-MediFlow doctor willing to
    receive a test share, and a few real patients willing to try it, before
    the full encryption stack gets built (business doc §10) — or confirm
    it's fine to build and dogfood internally first instead.
11. Loop in the doctor this app actually serves — his operational buy-in
    (how much vault-request UI he wants inside an encounter) hasn't been
    part of this research.
12. Designate a DPDP grievance/compliance contact — already an open gap in
    `docs/qa/ProductionReadinessBacklog.md` (item A9), independent of this
    feature, but Vault Share raises the stakes on it.

**Small sign-offs against existing written rules**
13. Explicit yes to amend `Rules.md` #9 — it currently states its one public,
    no-session link exception is the *sole* one; Flow A needs a second.
14. Whether to correct `Tracker.md`'s stale "vault: undecided" line now
    (flagged earlier in this process, never fixed) or leave it for later.

## 1. Summary

Every MediFlow consult already produces a structured record — prescription,
SOAP note, uploaded reports. That's Tier 1/2 of the vault, already decided in
`medical-vault.md`, sequenced to Wave C. What's undesigned is the
**portability promise**: a patient's history should travel to *any* doctor,
on or off MediFlow, without that doctor needing an account, an integration,
or a hospital-chain relationship. That's this document's subject — call it
**Vault Share**.

The founder's framing is right and matches the product's own stated moat
(`PRODUCT.md` §1). It is **not**, however, a novel mechanism — see §2 below
before treating any of this as a first-mover story.

## 2. Reality check — read this before scoping anything else

A second research pass (full detail in
[vault-share-business.md §2](vault-share-business.md)) found two things that
directly change how this PRD should be scoped:

1. **OTP/time-limited/encrypted health-record sharing is prior art**,
   patented repeatedly since 2011 (most recently a 2024/2025-era US grant
   whose title nearly matches this feature's own design) and already live at
   a funded India competitor (Eka Care's "consent PIN") and in US hospital
   EHRs (Epic's Share Everywhere). Building it is sound engineering, not a
   defensible invention — a real patent freedom-to-operate review is a
   dependency before scaled shipment (§9 decision #5), not a formality.
2. **The specific product category — a stand-alone-ish consumer health
   vault — has a well-documented graveyard**: Google Health (2008–2011) and
   Microsoft HealthVault (2007–2019), both shut down, both for the same root
   cause: depending on patients to manually feed the vault, with no tether
   to a real care workflow. MediFlow's Tier 1 (auto-capture from an actual
   paid consult) already matches the pattern that survives. **Tier 2**
   (manually uploading old paper records) is structurally the piece that
   matches the pattern that killed the two biggest names in this category.

**Practical effect on this PRD's scope:** Tier 1 has no reason to wait on
anything below. Vault Share (Flow A, §4) is worth building as a
disciplined, cheaply-validated feature, not the headline pitch. Tier 2 stays
designed (§6.2) but should not receive further build investment until Tier 1
and Flow A produce real usage evidence (business doc §7/§10 for the full
sequencing argument).

## 3. Goals

1. A patient never loses a prescription, report, or consult note again —
   already the Tier 1 promise, reinforced here.
2. A patient can hand their history to a doctor who has never heard of
   MediFlow, in under 60 seconds, with no app install on the doctor's side.
3. Every disclosure is scoped, time-limited, revocable, and logged back to the
   patient — "who saw what, when" is always answerable.
4. Nothing sensitive is ever at rest without encryption the app itself cannot
   unilaterally read around (see TRD §5).
5. The feature satisfies, rather than adds to, MediFlow's open DPDP backlog
   items (export/erasure, retention/purge, encryption-at-rest — `docs/qa/
   ProductionReadinessBacklog.md` B2/B5/B7, A7).

## 4. Non-goals (this document)

- Re-deciding Tier 1/2 (auto-capture, in-app OCR tagging) — already settled.
- ABDM/ABHA certification — still a distinct, deferred decision.
- Family/dependent profiles — flagged in `medical-vault.md` as a fast-follow;
  out of scope here, but the data model (TRD §3) doesn't block it.
- Doctor-side EMR integrations (push into a hospital's own system) — Phase 4
  territory.
- **Claiming this is a novel mechanism, internally or externally** — per §2,
  it isn't, and the PRD/business framing should never imply otherwise.

## 5. Two sharing modes (this is the core design decision)

The founder's description blends two different situations that need different
UX and different trust levels. Separating them is the main product decision
this PRD makes:

| | **In-platform request** (Flow B) | **Anywhere share** (Flow A) |
|---|---|---|
| Who initiates | The doctor, from an active/scheduled MediFlow appointment | The patient, before or during any visit — including a doctor who has never used MediFlow |
| Receiving doctor | Already has a MediFlow account + relationship | No account, no integration, possibly first time hearing of MediFlow |
| Trust anchor | Existing authenticated session + real appointment | A one-time OTP the patient personally generates and reads out |
| Friction budget | Low — one tap to approve | Must work for a non-technical patient standing at a reception desk |
| Grant mechanism | In-app approve/deny, scoped to the appointment | Share code + OTP, viewed on a public link, no login |
| **Build priority (revised, §2)** | Rides existing AuthZ, cheap — build alongside Tier 1 | Cheap, small, validate with real users before investing in the full encryption stack |

Both converge on the same underlying grant/audit model (TRD §3–4); they differ
only in how the grant gets created.

## 6. User stories

**Patient**
1. After any MediFlow consult, my prescription, note, and reports are already
   in my vault — I don't do anything (Tier 1, existing).
2. I can add an old paper prescription or lab report by photographing it; the
   app reads it and files it correctly, or tells me plainly it couldn't and
   lets me fill it in by hand (Tier 2, existing design — deprioritized for
   build per §2 until Tier 1/Flow A usage is proven).
3. Before I see a new doctor — MediFlow or not — I can generate a **share
   code** in under 60 seconds, choose what time window it's good for, and
   read the doctor a short code and a one-time OTP.
4. I can see, at any time, a log of every share I've created and who actually
   opened it — and revoke any that's still active.
5. I can download my entire vault as one file at any time (DPDP export
   right), and I can delete my account's vault data, with a clear warning
   about what that means for continuity of care.
6. If a MediFlow doctor requests access to my full vault ahead of an
   appointment, I get a plain-language ask and can approve or decline with
   one tap — I'm never surprised by what they can see.

**Doctor (receiving, off-platform or first-time)**
1. I can open a link a patient gives me, enter the code they read me, and see
   a clean, dated timeline of their relevant history — no signup, no app.
2. I can tell at a glance what I'm looking at is time-limited and that the
   patient controls it (builds trust that this isn't a marketing funnel
   aimed at me).

**Doctor (MediFlow, treating)**
1. For a returning patient, I already see their MediFlow history automatically
   (existing). For a new or infrequent patient, I can request their fuller
   vault (including outside records) with one action, and see a plain
   "pending patient approval" state until they respond.

## 7. UX flows

Both flows are patient screens on `/patient/vault` (new) and a doctor-facing
public view at a new unauthenticated route. Visual language follows
`docs/Design.md` exactly — this section describes structure and states, not
final pixels; hi-fi mockups are a follow-up once this PRD is approved.

### 7.1 Vault home (`/patient/vault`)

A dated, filterable timeline — explicitly **not** a flat file list (the
DigiLocker failure mode identified in the business doc §2.4). Each entry
shows type badge (Rx / Lab / Scan / Discharge / Note), date, source (MediFlow
doctor name, or free-text facility for outside uploads), and a one-line
extracted highlight (e.g., "HbA1c 7.2%" or "Amoxicillin 500mg × 5 days"). A
trend strip at the top surfaces tracked values over time for patients with
repeat labs — the concrete "doctor can analyze trends" capability, and the
clearest differentiator over a plain document locker.

Empty state: *"Your vault is empty. It fills automatically after every
MediFlow visit, or add an old report now."*

### 7.2 Add an old record (Tier 2, existing design, build deprioritized)

Photo/PDF upload → "reading your report… this is private and encrypted"
reassurance copy (matches `triage-booking-flow-design.md` #6) → structured
preview for the patient to confirm or correct before saving → on
low-confidence parse, same degrade-to-manual pattern already designed for
triage: "We couldn't read this clearly — fill in the basics yourself," never
a dead end. Designed here so it's ready to build once Tier 1/Flow A justify
the investment (§2).

### 7.3 Flow A — Anywhere Share (the MVP-priority piece, per §2)

1. Patient taps **Share my vault** from vault home or from a booking
   confirmation screen ("Seeing a new doctor? Share your history").
2. **Scope step**: patient picks what to share — *Everything* / *Last 6
   months* / *A specific condition thread* — and a duration — *This visit
   only (2 hours)* / *24 hours* / *7 days*. Defaults to the narrowest
   sensible option, not "everything forever."
3. Patient confirms with their own account OTP (delivered via the existing
   Better Auth OTP channel — no new delivery infra). Proves the account
   holder, not just whoever is holding the phone, authorized the share.
4. App shows a **short share code** plus a QR code, and a countdown matching
   the chosen duration. Copy: *"Read this code to your doctor, or let them
   scan it."*
5. Patient tells the doctor the code (or the doctor scans the QR).
6. Doctor opens `mediflow.app/vault/view` on any device, enters the code —
   no login, no app. Sees a read-only, printable summary scoped exactly as
   chosen, with a visible banner: *"Shared by [Patient name] · expires in
   1:58:32 · [Report a problem]."*
7. Patient's vault home shows a live "Currently shared" card while active,
   with a **Revoke now** button, and afterward an audit line: *"Viewed by a
   doctor on Aug 11, 2:04 PM."*

Modeled on the same shape as Epic's "Share Everywhere" and Eka Care's
"consent PIN" — both validated, neither novel (§2). MediFlow's own addition
is the OTP-as-authorization-gate at creation time (TRD §4).

### 7.4 Flow B — In-platform doctor request

1. From an encounter or patient-detail screen, MediFlow doctor taps **Request
   full vault access**.
2. Patient gets an app + email notification: *"Dr. [Name] is requesting
   access to your full health vault ahead of your Aug 11 appointment.
   [Approve] [Decline]"* — plain language, states the reason, tied to a real
   appointment.
3. One tap to approve; grant scoped to that appointment ± 72 hours (chart
   review happens before/after the call, not just during it).
4. Doctor's encounter view shows a **quiet unlock**, not a modal interrupt —
   the existing returning-patient history panel just gains outside-record
   rows once approved. If not yet approved: "Vault access requested —
   awaiting patient," never a block.

### 7.5 States

| Screen | Loading | Empty | Error | Expired |
|---|---|---|---|---|
| Vault home | skeleton rows | "Vault is empty" + add action | fetch failed → retry banner | — |
| Share creation | code generation spinner (~1s) | — | OTP send failed → retry, console-style dev fallback mirrors existing OTP degrade | — |
| Doctor view | "Checking code…" | — | wrong/expired code → "This link is no longer valid — ask the patient for a new one," never a raw 404 | Explicit "This share expired at 4:02 PM" state, not a blank page |
| Vault request (Flow B) | — | — | — | Unactioned request auto-expires in 48h, patient sees it drop off, doctor sees "Request expired" |

## 8. Compliance requirements this feature must meet

- **DPDP consent**: every disclosure — Flow A or B — is captured as an
  explicit, scoped, timestamped, revocable consent record (backlog B9).
- **Export**: "download my whole vault" satisfies the DPDP data-subject
  access right (B5).
- **Erasure**: account/vault deletion path with a continuity-of-care warning
  (B5/B7).
- **Retention**: see open decision §9 #1 — do not encode a fixed 5–10 year
  auto-purge without the tradeoff being explicitly chosen.
- **MediFlow is not a DPDP "Consent Manager"** — a licensed, separately
  regulated role (₹2 crore net worth, Data Protection Board registration,
  business doc §6). This boundary must not blur as the feature evolves (TRD
  §9/§10).

## 9. Success metrics

- % of consults where the patient's vault has ≥1 outside record added.
- % of patients who create at least one Anywhere Share within 90 days.
- Median time from "tap Share" to "doctor viewing" (target: under 2 minutes).
- Share completion rate (code generated → actually opened).
- **Usage at 90/180 days, not just at signup** — PHR engagement research
  (business doc §2.2) consistently shows usage peaks at adoption and decays;
  plan to measure the decay curve, not just the launch spike.
- Zero unauthorized-access incidents (any view without a valid, unexpired
  grant is a P0).

## 10. Open decisions (need founder input before TRD build sequencing locks)

**Decided 2026-08-11**, via direct founder Q&A: #1 retention → indefinite +
patient-controlled delete (confirmed as recommended). #2 timing → build now,
in parallel with the booking push, **not** the wait-for-the-gate
recommendation below — founder's explicit call, respected; the reasoning
stays in the table for risk-awareness during build, not as the operative
plan. #3 monetization → deferred; ship ungated/free for now, price later.
The table below is the original analysis these decisions were made against.

| # | Decision | Recommendation | Why it's open |
|---|---|---|---|
| 1 | Fixed 5–10yr retention (founder's original framing) vs. indefinite-while-active with patient-controlled deletion | **Indefinite + patient-controlled delete**, not a fixed wall | A forced auto-purge at year 5–10 destroys exactly the "trend over years" value this feature exists to deliver. Statutory *provider*-side retention (separate, shorter, ~3yr under Indian Medical Council norms) is a different obligation from *patient*-owned vault retention. |
| 2 | Launch timing vs. Phase 3 gate / Phase 0 booking-validation gate | **Revised, more conservative than the first draft**: Tier 1 proceeds now regardless; Flow A MVP waits until the Phase 0 gate (~5 real paid bookings) clears, then ships as a small validated bet — not pulled forward ahead of core-product validation | The regulatory clock (ABDM 2027) is real but slow; the bigger risk found in research is investing in a crowded, patent-thicketed feature category before the core product has proven itself with real patients (business doc §7) |
| 3 | Bundle Vault Share into MediFlow Care subscription, or price standalone | Freemium: Tier 1 always free, Anywhere Share free within limits, unlimited + family profiles as paid | See business doc §8 for full analysis |
| 4 | SMS OTP vs. email-only for the self-confirm step (§7.3 step 3) | Start email-only, add SMS if drop-off data shows patients stalling here | Real behavioral data doesn't exist yet |
| 5 | **New** — patent freedom-to-operate review | Commission a real FTO opinion from patent counsel before Flow A ships beyond a small pilot | US 12183441 and related prior art are close enough to this design's mechanism that this is a genuine dependency, not due diligence theater (business doc §2.1) |
| 6 | **New** — Tier 2 build investment | Hold further build past the existing design (§7.2) until Tier 1 + Flow A produce real usage evidence | Tier 2 structurally matches the pattern that killed Google Health and Microsoft HealthVault (business doc §2.2/§2.3) — worth designing, not worth building blind |

## 11. Risks

Regulatory misclassification as a Consent Manager; a breach of the vault
being existential to trust (business doc §5); DigiLocker/ABDM closing the
"generic portability" gap before MediFlow ships (business doc §7);
receiving-doctor friction killing adoption; **patent/FTO exposure** given how
crowded the prior art is (§2, business doc §2.1); and the **category-level
adoption risk** this revision surfaced — this exact type of product has a
real graveyard, built by companies with far more resources than are
available here (business doc §2.2). Full analysis and an unhedged honest
verdict: business doc §12.
