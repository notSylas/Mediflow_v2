# MediFlow v2 — Pre-Production Test Backlog (Jira-ready)

Last updated: 2026-07-13 · Owner of this doc: QA · Target: v1 launch

This is the **master backlog** for the pre-production testing cycle. It is written to
be copied into Jira ticket-by-ticket, or imported in bulk from the companion file
[`jira-import.csv`](./jira-import.csv). Full execution detail lives here; the CSV
carries the importable skeleton (type, summary, component, labels, owner, priority)
and points back to the ticket IDs below.

Grounded in the **actual implementation** (routes, API endpoints, gate logic, and
existing Playwright/Vitest coverage) as of commit `a4933cb` — not a generic QA list.

---

## 1. Jira conventions (shared)

### 1.1 Project & hierarchy
- **Project key:** `MFQA`
- **Hierarchy:** one **Epic** → **Test** execution tickets grouped by product flow →
  **Bug** tickets (linked to the failing Test) → **Task** tickets (non-defect / missing setup).
- **Issue types:** `Epic`, `Test` (use `Story` if your Jira has no Test type), `Bug`, `Task`.

### 1.2 Components
`Auth` · `Booking` · `Payments` · `Video/Consult` · `Clinical/Encounter` ·
`Prescriptions` · `Care Subscription` · `Messaging/Realtime` · `Email/Notifications` ·
`Security/AuthZ` · `Mobile` · `Deployment/Ops` · `Cross-cutting/UX`

### 1.3 Labels
`web` · `mobile` · `patient` · `doctor` · `api` · `manual` · `e2e-covered` ·
`unit-covered` · `launch-blocker` · `regression` · `expo-go` · `eas-build` ·
`needs-test-data` · `third-party` (Razorpay/LiveKit/Resend)

### 1.4 Priority
`P0 Highest` (launch blocker) · `P1 High` · `P2 Medium` · `P3 Low`

### 1.5 Bug severity (custom field `Severity`)
| Level | Meaning | Example |
|---|---|---|
| `S1 Blocker` | Data loss, security hole, payment/double-book, or core flow unusable | Two patients book the same slot; issued Rx editable; IDOR leak |
| `S2 Critical` | Core flow broken with no workaround | Payment succeeds but appointment stays pending; call won't connect |
| `S3 Major` | Feature broken but has a workaround | Reschedule dialog errors but cancel+rebook works |
| `S4 Minor` | Cosmetic / non-blocking functional defect | Wrong timezone label; skeleton flashes |
| `S5 Trivial` | Copy, spacing, polish | Emergency disclaimer wording inconsistent |

**Severity ≠ Priority.** Severity = impact; Priority = fix order. An S2 with an easy
workaround on a rarely-used path can still be P2.

### 1.6 Workflow states
- **Test:** `Backlog → To Do → In Progress → Blocked → Passed / Failed`
  (`Failed` requires ≥1 linked Bug; `Blocked` requires a reason in the comment).
- **Bug:** `Open → In Progress → Fixed → Ready for Retest → Closed` (or `Reopened`).
- **Task:** `To Do → In Progress → Done`.

### 1.7 Bug reproduction template (paste into every Bug)
```
**Environment:** <Web/Mobile> · <build/commit> · <browser+version / device+OS>
**Component / Flow:** <e.g. Booking → payment>
**Severity:** S1–S5   **Priority:** P0–P3
**Preconditions / test data:** <accounts, seeded state>
**Steps to reproduce:**
1.
2.
3.
**Expected:**
**Actual:**
**Evidence:** <screenshot / screen recording / HAR / server log excerpt>
**Linked Test:** MFQA-<id>   **Regression?** <yes/no + since which build>
```

### 1.8 Retest & regression rules
- Every Bug moved to `Fixed` returns to its author for retest on the **build that
  contains the fix** (record the build/commit on the retest comment).
- A `Failed` Test cannot be marked `Passed` until **all** its linked Bugs are `Closed`.
- **Regression scope on any fix touching shared logic** (`src/lib/*`, auth, DB
  indexes, payment/webhook, realtime token): re-run the linked automated spec **plus**
  the smoke set (§5) before closing.
- Reopen (not new ticket) if the same defect recurs within 2 builds.

### 1.9 Environment / platform matrix (fill per Test in the ticket)
- **Environments:** Local (prod build) · Staging (Razorpay test keys, real LiveKit/Resend/Neon) · Production smoke (post-deploy, refunded live payment).
- **Web browsers:** Chrome (primary), Safari, Firefox; mobile web Safari iOS + Chrome Android.
- **Mobile:** Expo Go (SDK 54) for non-native flows; **EAS dev build** for native payment + LiveKit media.
- **Devices:** ≥1 iOS + ≥1 Android physical device; two devices/networks for the video call test.

### 1.10 Owners
- **Tester A** — Patient experience (booking, payment, consult-patient side, prescriptions-view, Care, patient messaging, patient mobile).
- **Tester B** — Doctor experience (setup, schedule, encounter, Rx issue, work queue, refills, Care admin, doctor mobile).
- **Both** — cross-role flows: video call (needs both ends), realtime messaging delivery, booking concurrency, security/authorization, deployment smoke.

---

## 2. Epic

### MFQA-1 — [EPIC] Pre-Production Testing — MediFlow v2 v1 Launch
**Component:** (all) · **Priority:** P0 · **Labels:** launch-blocker
**Goal:** Verify every patient- and doctor-facing flow across web and mobile, plus
security, payments, video, messaging, email, and operational readiness, and sign off
against the launch exit criteria (§6) before production deploy.
**Success:** All P0/P1 Tests `Passed`; zero open `S1`/`S2` Bugs; exit checklist complete.
**Child issues:** all `MFQA-*` Tests, Bugs, and Tasks below.

---

## 3. Test-execution tickets

> Each ticket carries: Summary · Component · Owner · Objective/Risk · Preconditions/Data ·
> Platform matrix · Steps · Expected · Negative/Edge · Evidence · Result field · Automation link.
> Priorities: core money/safety/security flows are P0; supporting flows P1; polish P2.

### AUTH & SESSION

#### MFQA-10 — Email-OTP login, signup-on-first-login, and logout (Web)
- **Component:** Auth · **Owner:** Both · **Priority:** P0 · **Labels:** web, patient, e2e-covered
- **Objective / risk:** New emails must auto-provision as `patient`; session must land on the correct role home; logout must fully clear session. Risk: broken auth blocks everything.
- **Preconditions / data:** A fresh email; dev OTP appears in server console (or Resend inbox on staging).
- **Platform matrix:** Local prod build + Staging; Chrome/Safari/Firefox.
- **Steps:** 1) Go to `/login`. 2) Enter a new email → submit. 3) Retrieve OTP (console/email) → enter. 4) Confirm redirect to `/patient`. 5) Reload — session persists. 6) Log out via header → confirm redirect to `/login` and protected route now bounces to `/login`.
- **Expected:** OTP delivered; new account created as `patient`; `/` redirects by role; logout clears cookie; back-button after logout does not expose authed pages.
- **Negative/edge:** Wrong OTP → error, no session. Expired/reused OTP rejected. Empty email validation.
- **Evidence:** Screen recording of full loop; console/email OTP screenshot.
- **Automation:** `e2e/auth.spec.ts` ("login, land on patient home, then logout"). Manual = cross-browser + email delivery.

#### MFQA-11 — Doctor clinic sign-in gate & role routing (Web)
- **Component:** Auth · **Owner:** Tester B · **Priority:** P0 · **Labels:** web, doctor, e2e-covered
- **Objective / risk:** `/doctor/login` must admit only `role=doctor`; a patient account must be blocked; `/` must route doctor→`/doctor`, patient→`/patient`, guest→`/login`.
- **Preconditions / data:** One `doctor` account (promoted via `npm run promote-doctor`), one `patient` account.
- **Steps:** 1) Sign in as patient at `/doctor/login` → blocked. 2) Sign in as doctor → lands `/doctor`. 3) As patient, hit `/doctor/*` → redirected to `/patient`. 4) Guest hits `/patient` → `/login`.
- **Expected:** Non-staff blocked at clinic sign-in; role landing correct; doctor pages require `role=doctor`.
- **Negative/edge:** Doctor visiting `/login` while authed is redirected away; deep-link to `/doctor/encounter/[id]` as patient blocked.
- **Automation:** `e2e/auth.spec.ts` ("non-staff account is blocked"; "authenticated users redirected away from /login").

#### MFQA-12 — Google sign-in (optional provider) (Web)
- **Component:** Auth · **Owner:** Tester A · **Priority:** P2 · **Labels:** web, patient, third-party
- **Objective:** When `GOOGLE_*` env is set, Google button appears on the patient surface and completes OAuth; redirect URI matches deploy domain.
- **Preconditions:** `GOOGLE_CLIENT_ID/SECRET` set; `/api/auth/callback/google` registered.
- **Steps:** Trigger Google login → complete consent → land `/patient`. Verify absent/hidden when env unset.
- **Negative/edge:** Cancelled consent returns gracefully; mismatched redirect URI shows a clear error, not a crash.
- **Automation:** none — manual only.

### SECURITY & AUTHORIZATION

#### MFQA-20 — Unauthenticated API rejection (401) across all protected routes
- **Component:** Security/AuthZ · **Owner:** Both · **Priority:** P0 · **Labels:** api, e2e-covered, launch-blocker
- **Objective / risk:** Every protected endpoint must reject anonymous requests with 401 — no data leakage.
- **Steps:** Run `e2e/api/authorization.spec.ts` + `route-guards.spec.ts`; spot-check 3 endpoints manually with no cookie (`/api/appointments`, `/api/v1/patient/home`, `/api/v1/conversations`).
- **Expected:** 401 for all; no body leakage.
- **Automation:** `e2e/api/authorization.spec.ts`, `e2e/api/route-guards.spec.ts` ("every protected route rejects the unauthenticated with 401").

#### MFQA-21 — Doctor-only routes reject patients (403) & patient IDOR protection
- **Component:** Security/AuthZ · **Owner:** Both · **Priority:** P0 · **Labels:** api, e2e-covered, launch-blocker
- **Objective / risk:** A patient must not reach doctor-only routes (403) or read/mutate another patient's appointment, report, or prescription (IDOR).
- **Steps:** Run `route-guards` + `idor` specs; manually attempt to GET another patient's `/api/v1/patient/appointments/[id]` and `/api/reports/[id]` with a second patient's cookie.
- **Expected:** 403 for doctor-only as patient; 403/404 (no data) for cross-patient reads; doctor can only touch appointments booked with them.
- **Negative/edge:** Guessed UUIDs; sequential-ID probing; attach another conversation's `attachmentId` (see MFQA-52).
- **Automation:** `e2e/api/route-guards.spec.ts` ("every doctor-only route rejects a patient with 403"), `e2e/api/idor.spec.ts`.

#### MFQA-22 — Input validation on booking/follow-up/refill payloads (400)
- **Component:** Security/AuthZ · **Owner:** Tester B · **Priority:** P1 · **Labels:** api, e2e-covered
- **Objective:** Malformed payloads are rejected with 400 (zod), not 500 or silent accept.
- **Steps:** Run `e2e/api/validation.spec.ts`; manually POST an out-of-range follow-up `inDays`, a non-UUID `prescriptionId`, and an invalid `visitReason`.
- **Expected:** 400 with a validation error; no row written.
- **Automation:** `e2e/api/validation.spec.ts` (invalid booking, out-of-range inDays, non-uuid refill id).

#### MFQA-23 — Realtime socket token: HMAC validity, expiry, refresh, CORS allowlist
- **Component:** Security/AuthZ · **Owner:** Both · **Priority:** P1 · **Labels:** api, unit-covered, third-party
- **Objective / risk:** Short-lived (15-min) HMAC socket tokens must verify against `REALTIME_SECRET`, reject tampered/expired tokens, refresh on reconnect; browser origins gated by `REALTIME_ALLOWED_ORIGINS` (native apps exempt — no Origin).
- **Preconditions:** Realtime server running (`npm run realtime`); app + server share the secret.
- **Steps:** 1) Get a token from `/api/v1/realtime/token`. 2) Connect socket — succeeds. 3) Tamper the token → rejected. 4) Wait past expiry → reconnect issues a fresh token. 5) Connect from a disallowed browser Origin → blocked; from native (no Origin) → allowed.
- **Expected:** Only valid, unexpired, correctly-signed tokens connect; CORS enforced for browsers.
- **Automation:** `src/lib/realtime-token.test.ts` (unit). Manual = live socket + CORS.

#### MFQA-24 — Production env safety audit (`check:env:strict`) & CRON_SECRET
- **Component:** Security/AuthZ · **Owner:** Both · **Priority:** P0 · **Labels:** launch-blocker, deployment
- **Objective / risk:** Missing keys silently degrade to mock payments / console email / an **open** reminder endpoint. Must fail closed before deploy.
- **Steps:** 1) Run `npm run check:env` and `npm run check:env:strict` against production values → strict passes. 2) `GET /api/cron/reminders` with no auth → 401; with `Authorization: Bearer <CRON_SECRET>` → 200.
- **Expected:** Strict audit passes; Razorpay/LiveKit/Resend/CRON_SECRET all present; reminder endpoint closed without secret.
- **Automation:** `scripts/check-production-env.ts` (invoked by the npm scripts). Manual = cron auth.

### DOCTOR SETUP & SCHEDULING

#### MFQA-30 — Doctor profile setup (specialty, bio, fee, slot length, timezone)
- **Component:** Clinical/Encounter · **Owner:** Tester B · **Priority:** P1 · **Labels:** web, doctor
- **Objective:** Profile auto-provisions on first `/doctor` visit; fee (paise), slot length, and timezone (`Asia/Kolkata` default) persist and drive downstream slot math + receipts.
- **Steps:** Visit `/doctor` → set specialty/bio/fee/slot length/timezone → save → reload → values persist. Confirm fee shows correctly (paise→₹) on the patient booking + receipt.
- **Negative/edge:** Zero/negative fee; very short/long slot length; non-default timezone reflected in slot times.
- **Automation:** none direct — manual; downstream covered by booking specs.

#### MFQA-31 — Weekly availability rules + date overrides → live slot computation
- **Component:** Booking · **Owner:** Tester B (setup) / Tester A (verify) · **Priority:** P0 · **Labels:** web, doctor, e2e-covered
- **Objective / risk:** Slots are computed at query time from `availability_rules` − `availability_overrides` − booked appointments (never materialized). A block override must remove slots; an extra-session override must add them.
- **Steps:** 1) Set a weekly rule (e.g. Mon 10:00–13:00). 2) Patient sees matching free slots on that date. 3) Add a **block** override for that date → slots disappear. 4) Add an **extra** session override → new slots appear. 5) Book one slot → it disappears from the list.
- **Expected:** Slot list reflects rules minus overrides minus bookings, in the doctor's timezone; DST/offset correct for `Asia/Kolkata`.
- **Negative/edge:** Overlapping rules; override on a day with no rule; past-date slots not offered; slot straddling midnight.
- **Automation:** `e2e/booking.spec.ts` ("doctor sets weekly availability and patient sees a matching slot"); `src/lib/slots.test.ts`, `availability` unit tests.

#### MFQA-32 — Doctor week schedule view (availability + bookings)
- **Component:** Clinical/Encounter · **Owner:** Tester B · **Priority:** P2 · **Labels:** web, doctor
- **Objective:** `/doctor/schedule` renders the week with availability blocks and booked appointments correctly placed.
- **Steps:** With rules + ≥2 bookings, open `/doctor/schedule`; verify each booking sits in the right day/time; navigate weeks.
- **Evidence:** Screenshot of a week with bookings.

### BOOKING, HOLD & CONCURRENCY

#### MFQA-40 — Patient booking intake: visit reason, symptoms, report upload, triage, consent
- **Component:** Booking · **Owner:** Tester A · **Priority:** P0 · **Labels:** web, patient, unit-covered
- **Objective / risk:** Intake captures one of 5 visit reasons + symptoms, optional report upload (immediate → `medical_reports`), runs emergency **red-flag triage**, and requires **telemedicine consent** (version stamped server-side).
- **Preconditions:** Logged-in patient; a small PDF/JPEG/PNG to upload.
- **Steps:** 1) `/patient/book` → pick visit reason + symptoms. 2) Upload a report → confirm it attaches. 3) Enter red-flag symptoms (e.g. "chest pain, can't breathe") → triage warning shows. 4) Attempt to proceed without ticking consent → blocked. 5) Tick consent → proceed.
- **Expected:** Triage flags red-flag input; consent required; consent **version/timestamp/source** persisted on the appointment (server sets version, not client); report stored and later visible to the doctor.
- **Negative/edge:** Oversized/wrong-type upload rejected; empty symptoms; consent version is server-authoritative (client can't spoof).
- **Automation:** `src/lib/triage.test.ts` (unit). Manual = upload + consent persistence.

#### MFQA-41 — Slot hold (10-min), expiry, and refresh-safe resume
- **Component:** Booking · **Owner:** Tester A · **Priority:** P0 · **Labels:** web, patient
- **Objective / risk:** Picking a slot creates a `pending_payment` row holding it for 10 min; URL becomes `?appointment=<id>` so refresh resumes; an expired hold is treated as free and lazily cancelled on the next booking attempt (410 → restart at intake).
- **Steps:** 1) Pick a slot → note `?appointment=<id>` and hold. 2) Refresh → flow resumes at payment for the same appointment. 3) Let the hold expire (>10 min) → attempt to pay → 410 → flow restarts at intake with a message. 4) A second patient can then take that slot.
- **Expected:** Hold reserves the slot for exactly the window; resume works; expiry frees the slot and restarts cleanly.
- **Negative/edge:** Two tabs on the same hold; back-button after payment; expiry exactly at boundary.
- **Automation:** partial via booking spec; hold-expiry path is **manual** (candidate new e2e — see MFQA-T-gap).

#### MFQA-42 — Payment: mock (dev), Razorpay Checkout, signature verify, webhook authoritative
- **Component:** Payments · **Owner:** Tester A · **Priority:** P0 · **Labels:** web, patient, third-party, launch-blocker
- **Objective / risk:** With keys set, the Razorpay popup opens; signature is verified server-side; the **webhook** (`payment.captured`) is the authoritative confirmation even if the patient closes the tab; failed payment does not confirm.
- **Preconditions (Staging):** `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` (test keys); webhook registered to `/api/webhooks/razorpay`.
- **Steps:** 1) Reach payment step → Razorpay popup opens. 2) Pay with a test card → appointment → `confirmed`; receipt available. 3) Repeat, but **close the tab** right after paying → confirm the webhook still flips it to `confirmed`. 4) Force a failed payment → stays `pending_payment`, slot releasable. 5) Confirm webhook shows 200 in Razorpay dashboard.
- **Expected:** Client callback best-effort; webhook authoritative; signature mismatch rejected; mock provider only when keys blank (dev/e2e).
- **Negative/edge:** Replayed/forged webhook signature rejected; double `verify` idempotent (no double confirm); amount tampering rejected.
- **Automation:** `src/lib/payments.test.ts` (signature). Manual = live popup + webhook + tab-close recovery.

#### MFQA-43 — Double-booking concurrency: exactly one of two racing bookings wins
- **Component:** Booking · **Owner:** Both · **Priority:** P0 · **Labels:** api, e2e-covered, launch-blocker
- **Objective / risk:** The partial unique index `uq_appointments_doctor_slot` is the final guard; the loser of a race gets 409 "Slot is no longer available". Expired `pending_payment` holds are cancelled before insert.
- **Steps:** Run `e2e/api/concurrency.spec.ts`; additionally fire two near-simultaneous booking POSTs for one slot manually and confirm exactly one 2xx + one 409.
- **Expected:** Never two confirmed appointments for one doctor-slot; loser 409; no partial/orphaned rows.
- **Automation:** `e2e/api/concurrency.spec.ts` ("concurrent bookings for one slot: exactly one wins"), `src/lib/booking.test.ts`.

#### MFQA-44 — Booking confirmation + email + resume summary
- **Component:** Booking · **Owner:** Tester A · **Priority:** P1 · **Labels:** web, patient, e2e-covered
- **Objective:** After payment, confirmation summary shows correct doctor/time/fee; booking-confirmation email sent (Resend or console fallback).
- **Steps:** Complete a booking → verify summary → verify confirmation email in inbox (staging) / console (dev).
- **Automation:** `e2e/booking.spec.ts` (books, confirms, cancels). Email = manual.

### APPOINTMENT MANAGEMENT (PATIENT)

#### MFQA-45 — Patient appointment list, detail, cancel (≥2h), reschedule, receipt
- **Component:** Booking · **Owner:** Tester A · **Priority:** P1 · **Labels:** web, patient, unit-covered
- **Objective / risk:** Patient can list appointments, open detail, cancel only ≥2h before start (and `pending_payment` anytime), reschedule a confirmed appointment via slot dialog, and print/PDF a receipt for a paid appointment.
- **Steps:** 1) `/patient/appointments` lists Upcoming/Past. 2) Open detail → join button state correct. 3) Cancel >2h before → succeeds. 4) Try to cancel <2h before → blocked with reason. 5) Reschedule a confirmed appointment → new slot picker → confirms. 6) Open `/patient/appointments/[id]/receipt` → print/PDF.
- **Expected:** 2h cancellation window enforced; reschedule frees old slot + holds new; receipt shows fee in ₹.
- **Negative/edge:** Cancel a completed/no-show appointment blocked; reschedule into an already-booked slot → 409.
- **Automation:** `src/lib/call-window.test.ts`, `booking.test.ts` (window logic). Manual = reschedule + receipt UI.

### VIDEO CONSULTATION

#### MFQA-46 — Call join window, pre-join device check, token authorization (Web, both ends)
- **Component:** Video/Consult · **Owner:** Both · **Priority:** P0 · **Labels:** web, third-party, launch-blocker
- **Objective / risk:** Join opens 10 min before start, closes 30 min after end; only a `confirmed` appointment's **participants** get a token (server-validated); unconfigured LiveKit → friendly 503, not a crash. Media must actually connect doctor↔patient across two devices/networks.
- **Preconditions:** `LIVEKIT_*` set; one confirmed appointment; two devices on different networks.
- **Steps:** 1) Before window → join disabled ("too early"). 2) Within window → `/call/[id]` pre-join camera/mic check → join. 3) Doctor joins from a second device → two-way audio/video. 4) After close window → "too late". 5) Non-participant patient requests a token → denied. 6) Unset LiveKit env → friendly error page.
- **Expected:** Window + participant + status gating exactly per `call-window.ts` (10 early / 30 late; `not_confirmed`/`too_early`/`too_late`); real media both directions.
- **Negative/edge:** Token for a cancelled appointment; token for someone else's room (`appt_<id>`); mic/cam permission denied handled.
- **Automation:** `src/lib/call-window.test.ts`, `realtime-token.test.ts` adjacent. Media = **manual, two devices**.

### ENCOUNTER, PRESCRIPTION & OUTCOME (DOCTOR)

#### MFQA-47 — Encounter: SOAP note autosave + returning-patient history
- **Component:** Clinical/Encounter · **Owner:** Tester B · **Priority:** P1 · **Labels:** web, doctor, e2e-covered
- **Objective / risk:** SOAP editor autosaves (debounced, flush on tab-hide, no save button); the right panel shows this patient's past consults + prescriptions + medicine history ("returning patient" badge). Risk: silent autosave loss.
- **Steps:** 1) Open `/doctor/encounter/[id]`. 2) Type SOAP → wait for debounce → reload → text persisted. 3) Type then immediately hide the tab → text flushed/saved. 4) For a returning patient, confirm history panel + badge populate.
- **Expected:** No lost keystrokes; history accurate and scoped to this patient only.
- **Negative/edge:** Rapid typing then navigate away; first-visit patient shows empty history (no badge).
- **Automation:** `e2e/consult.spec.ts` ("consultation, prescription, and returning-patient history").

#### MFQA-48 — Prescription: draft → issue (locks forever); edit-after-issue rejected (409)
- **Component:** Prescriptions · **Owner:** Tester B · **Priority:** P0 · **Labels:** web, doctor, e2e-covered, launch-blocker
- **Objective / risk:** A structured Rx (medicines + schedule/food/duration + advice) saves as draft, then **issue** locks it permanently behind a confirm dialog; any later edit → 409. Patient sees the issued Rx.
- **Steps:** 1) Compose Rx (medicine autocomplete, schedule "Morning, Night · After food · 5 days"). 2) Save draft → editable. 3) Issue (confirm dialog) → locked. 4) Attempt to edit/re-issue → 409 with explanation. 5) Patient `/patient/prescriptions` + detail shows it.
- **Expected:** Issue is irreversible; locked Rx immutable server-side; patient view matches.
- **Negative/edge:** Issue with zero medicines; concurrent draft edits; issue on an appointment not completed.
- **Automation:** `e2e/consult.spec.ts` (full loop incl. Rx). Manual = 409 edit-after-issue + patient view.

#### MFQA-49 — Outcome: mark completed / no-show with safety confirms
- **Component:** Clinical/Encounter · **Owner:** Tester B · **Priority:** P1 · **Labels:** web, doctor
- **Objective / risk:** Irreversible outcome actions require confirm dialogs; no-show is separated from complete; patient sees consolidated status labels (patient "Missed" vs doctor "No-show").
- **Steps:** Mark completed → confirm dialog + completion warnings (SOAP/Rx checklist) → status updates + toast. On another appointment mark no-show → separate confirm. Verify patient-side label mapping.
- **Automation:** none direct — manual; labels in `src/lib/appointment-status.ts`.

### PRESCRIPTIONS, REFILLS & FOLLOW-UPS

#### MFQA-50 — Patient prescriptions list & permanence
- **Component:** Prescriptions · **Owner:** Tester A · **Priority:** P2 · **Labels:** web, patient
- **Objective:** `/patient/prescriptions` lists all issued Rx permanently with detail (medicines, schedule, advice).
- **Steps:** After ≥2 issued Rx, list shows both; open detail; confirm they persist across sessions.

#### MFQA-51 — Refill requests: patient create (no duplicate pending), doctor fulfil via async consult / decline
- **Component:** Prescriptions · **Owner:** Both · **Priority:** P1 · **Labels:** web, e2e-covered
- **Objective / risk:** Patient can request a refill from a prescription card; a second request while one is pending is prevented; doctor fulfils (→ async consult) or declines from `/doctor/refill-requests`.
- **Steps:** Run `e2e/api/refills-followups.spec.ts`; manually create a refill, attempt a duplicate (blocked), doctor fulfils → async consult created; doctor declines another.
- **Automation:** `e2e/api/refills-followups.spec.ts` ("refill: create (no duplicate pending), doctor fulfils via async consult").

#### MFQA-52 — Follow-ups: doctor recommends, only owning patient can act, inDays validated
- **Component:** Clinical/Encounter · **Owner:** Both · **Priority:** P1 · **Labels:** web, e2e-covered
- **Objective:** Doctor recommends a follow-up (inDays); only the owning patient can act on it; out-of-range inDays rejected (400).
- **Automation:** `e2e/api/refills-followups.spec.ts` ("follow-up: doctor recommends, only the owning patient can act"), `validation.spec.ts`.

#### MFQA-53 — Doctor work queue & patient roster/record
- **Component:** Clinical/Encounter · **Owner:** Tester B · **Priority:** P1 · **Labels:** web, doctor
- **Objective:** `/doctor/work-queue` surfaces needs-Rx, unread messages, refills, follow-ups, triage flags with counts; `/doctor/patients` search + "needs attention" filter + per-patient badges; patient record shows clinical snapshot, timeline, reports, medicine history, refills/follow-ups, message signal.
- **Steps:** Seed a mix of states → verify each queue category populates + counts; roster filter + badges; open a patient record and verify each panel.
- **Negative/edge:** Empty queue state; patient with no history.

### CARE SUBSCRIPTION

#### MFQA-60 — Care checkout & activation (mock ₹499/mo), configurable price, status
- **Component:** Care Subscription · **Owner:** Tester A · **Priority:** P1 · **Labels:** web, patient
- **Objective / risk:** Patient sees doctor-configured monthly price pre-checkout, completes mock checkout at `/patient/care/checkout`, subscription becomes `active` with a 1-month period; status card reflects it. (Real Razorpay recurring is deferred.)
- **Steps:** 1) Doctor sets `care_plan_price` in settings. 2) Patient opens Care card → checkout shows that price → mock pay → active. 3) Home/dashboard Care card + messages unlock reflect active state.
- **Negative/edge:** Price of 0; activating when already active; period boundary.

#### MFQA-61 — Care cancellation: pro-rated deduction/refund breakdown
- **Component:** Care Subscription · **Owner:** Tester A · **Priority:** P1 · **Labels:** web, patient, unit-covered
- **Objective / risk:** `/patient/care/cancel` shows a deterministic pro-rated breakdown — used days non-refundable, unused remainder refunded (7 working days) — identical on the confirm screen and server-side.
- **Steps:** Activate, advance part-way through a period (test data), open cancel → verify used/remaining days, deduction, refund match `computeCancellationBreakdown`; confirm → subscription ends.
- **Negative/edge:** Cancel on day 0 (near-full refund); cancel at period end (near-zero refund); no active sub.
- **Automation:** `src/lib/care-subscription-policy.test.ts` (unit). Manual = UI parity.

#### MFQA-62 — Care follow-up credit: one per period; doctor fulfil/dismiss
- **Component:** Care Subscription · **Owner:** Both · **Priority:** P1 · **Labels:** web, e2e-covered
- **Objective:** An active subscriber gets exactly one monthly async follow-up credit; using it decrements availability; doctor fulfils (→ async consult) or dismisses from care management / work queue.
- **Steps:** Run `e2e/api/care-plan.spec.ts`; manually consume the credit, attempt a second in-period (blocked), doctor fulfils.
- **Automation:** `e2e/api/care-plan.spec.ts` ("care plan gates messaging and grants one monthly follow-up").

#### MFQA-63 — Doctor Care management: subscriber count, members, admin toggle, badges
- **Component:** Care Subscription · **Owner:** Tester B · **Priority:** P2 · **Labels:** web, doctor
- **Objective:** `/doctor/care` shows subscriber count + member list + admin activate/deactivate toggle; subscriber badge appears on patient detail, patient list ("members" filter), and messages list/header.
- **Steps:** Toggle a subscriber on/off → count + badges update across surfaces; roster "members" filter works.

### MESSAGING & REALTIME

#### MFQA-70 — Messaging gate: active Care subscription only (paid consult does NOT unlock)
- **Component:** Messaging/Realtime · **Owner:** Both · **Priority:** P0 · **Labels:** web, e2e-covered, launch-blocker
- **Objective / risk:** `patientCanMessageDoctor` grants messaging **only** to patients with an active Care subscription. A one-off paid consult must NOT unlock chat. Expired-period subscription must lose access.
- **Steps:** 1) Patient with a paid consult but no subscription → messaging locked (conversation not created; `/api/v1/conversations` returns nothing/denied). 2) Activate Care → messaging unlocks. 3) Let the period elapse (status `active` but past end) → access revoked. 4) Doctor's conversation list only shows active subscribers.
- **Expected:** Gate matches `chat.ts` + `care-subscription-policy.isSubscriptionActive` (active/manual_trial AND now within period).
- **Negative/edge:** `manual_trial` unlocks; deactivated mid-conversation → thread becomes inaccessible.
- **Automation:** `e2e/api/care-plan.spec.ts`, `src/lib/chat-policy.test.ts`, `care-subscription-policy.test.ts`.

#### MFQA-71 — Messaging: send/receive, pagination, read receipts, unread counters
- **Component:** Messaging/Realtime · **Owner:** Both · **Priority:** P1 · **Labels:** web
- **Objective:** Messages persist via REST first; page size 30 with cursor pagination (load older); recipient's unread increments; opening the thread clears unread + stamps read receipts on the other side's messages.
- **Steps:** Exchange >30 messages → scroll loads older; verify unread badge increments for recipient and clears on open; read receipts stamp.
- **Negative/edge:** Empty body + attachment-only message shows "📎 Attachment" preview; concurrent first-message race creates a single conversation (idempotent insert).

#### MFQA-72 — Messaging attachments: bound to conversation + uploader (IDOR)
- **Component:** Messaging/Realtime · **Owner:** Both · **Priority:** P0 · **Labels:** web, api, unit-covered, launch-blocker
- **Objective / risk:** An attachment may only be sent by its uploader into the same conversation it was uploaded to; a leaked/guessed `attachmentId` cannot be attached elsewhere to read another user's file.
- **Steps:** Upload an attachment in conversation A; attempt to reference that `attachmentId` from conversation B / as a different sender via `/api/v1/conversations/[id]/messages` and `/api/v1/attachments/[id]` → denied.
- **Automation:** `src/lib/chat-policy.test.ts` (`attachmentUsableBy`), `e2e/api/idor.spec.ts`. Manual = end-to-end file open.

#### MFQA-73 — Realtime live delivery, token refresh, REST fallback when socket down
- **Component:** Messaging/Realtime · **Owner:** Both · **Priority:** P1 · **Labels:** web, third-party
- **Objective / risk:** With the socket server up, a message sent on one device appears live on the other (Postgres LISTEN/NOTIFY → socket.io); if the socket is down, chat still works over REST (message appears on refetch). Token refreshes on reconnect.
- **Preconditions:** `npm run realtime` running; two browser sessions (patient + doctor), both active subscribers.
- **Steps:** 1) Both threads open → send from patient → appears live on doctor without refresh. 2) Stop the realtime server → send again → not live, but appears after refetch/reopen. 3) Restart server → reconnect resumes live delivery.
- **Expected:** Best-effort live delivery; REST is the source of truth; graceful degradation.
- **Negative/edge:** `GET https://<realtime-host>/` returns `realtime ok`. **Note:** no automated socket-delivery e2e exists yet (see Task MFQA-903).

### EMAIL & NOTIFICATIONS

#### MFQA-80 — Transactional email: OTP, booking confirmation, reminder cron
- **Component:** Email/Notifications · **Owner:** Both · **Priority:** P1 · **Labels:** third-party, deployment
- **Objective / risk:** With `RESEND_API_KEY` + `EMAIL_FROM`, OTP + booking-confirmation + pre-consult reminder emails deliver; without the key they log to console (dev only). The reminder cron `/api/cron/reminders` sends reminders when invoked and is protected by `CRON_SECRET`.
- **Steps (Staging):** 1) Login → OTP email arrives. 2) Book → confirmation email arrives. 3) Create an appointment ~within reminder lookahead → invoke `/api/cron/reminders` with the secret → reminder email arrives; verify it 401s without the secret. 4) Verify console fallback when key unset (dev).
- **Expected:** All three emails render correctly (correct time/timezone, links); no duplicate reminders.
- **Negative/edge:** Reminder not sent twice for the same appointment; unsubscribed/invalid address handled. **Production scheduler must actually invoke the cron** (Vercel cron declared in `vercel.json`, every 10 min).
- **Automation:** none — manual (third-party delivery).

### REPORTS

#### MFQA-81 — Medical report upload + participant-aware download authorization
- **Component:** Security/AuthZ · **Owner:** Tester A · **Priority:** P1 · **Labels:** web, api
- **Objective / risk:** Patient uploads PDF/JPEG/PNG at intake (stored as bytea in `medical_reports`); only the uploading patient or the appointment's doctor may download (`/api/reports/[id]`). Wrong type/oversize rejected.
- **Steps:** Upload each supported type; download as owner + as appointment doctor → allowed; as a different patient / different doctor → denied.
- **Negative/edge:** `.exe`/oversize rejected; report from an unrelated appointment not accessible.
- **Automation:** `e2e/api/idor.spec.ts` ("cannot read or mutate another patient's appointment or report").

### MOBILE (EXPO)

#### MFQA-90 — Mobile auth + role routing (Expo Go)
- **Component:** Mobile · **Owner:** Both · **Priority:** P1 · **Labels:** mobile, expo-go
- **Objective:** OTP login + verify + SecureStore session + role routing to `(patient)`/`(doctor)` tabs run in Expo Go; cookie-attached fetch reaches the LAN dev server (`EXPO_PUBLIC_API_URL`).
- **Preconditions:** `mobile/.env` `EXPO_PUBLIC_API_URL` = dev machine LAN URL; phone + laptop same network; `npx expo start`.
- **Steps:** Login on device → OTP → land on correct tabs; kill/reopen app → session persists; logout clears.
- **Negative/edge:** Wrong LAN URL → clear failure; doctor vs patient tab sets differ.

#### MFQA-91 — Mobile patient flows (Expo Go): home, book, appointments, reschedule/cancel, prescriptions, profile, receipt, settings, Care
- **Component:** Mobile · **Owner:** Tester A · **Priority:** P1 · **Labels:** mobile, patient, expo-go
- **Objective:** Patient tabs mirror web: action-led home, booking (intake + native DOB picker + slot picker + **mock** payment), appointments + detail, reschedule/cancel, prescriptions, structured profile, receipt, settings, Care card + checkout/cancel.
- **Steps:** Walk each screen; complete a **mock-payment** booking; reschedule; cancel; open a prescription; edit profile; open receipt; Care checkout (mock).
- **Negative/edge:** Loading/error/empty states; accessibility labels; real-payment recovery UX shows the "requires native build" path.
- **Automation:** none — manual device testing.

#### MFQA-92 — Mobile doctor flows (Expo Go): dashboard, appointments, encounter/SOAP/Rx, patients, schedule, work-queue, refills, Care, settings
- **Component:** Mobile · **Owner:** Tester B · **Priority:** P1 · **Labels:** mobile, doctor, expo-go
- **Objective:** Doctor tabs mirror web clinical workflow on device.
- **Steps:** Open dashboard; appointments → encounter → SOAP autosave → compose + issue Rx; patients/history; schedule editor; work-queue categories; refill fulfil/decline; Care management; settings (fee, slot, Care price).
- **Negative/edge:** Rx issue lock on device; SOAP autosave on backgrounding the app.

#### MFQA-93 — Mobile messaging/chat (Expo Go)
- **Component:** Mobile · **Owner:** Both · **Priority:** P1 · **Labels:** mobile, expo-go
- **Objective:** Care-gated chat works on device — live delivery (socket, token auth; native apps exempt from CORS), pagination, PDF open, read state, unread badges.
- **Steps:** As an active subscriber, exchange messages device↔web; load older; open a PDF attachment; verify read state + unread.
- **Negative/edge:** Non-subscriber sees the locked/unlock state; socket down → REST fallback.

#### MFQA-94 — Mobile native Razorpay Checkout (EAS dev build) — BLOCKED until build exists
- **Component:** Mobile · **Owner:** Tester A · **Priority:** P2 · **Labels:** mobile, eas-build, third-party, launch-blocker
- **Objective:** Real Razorpay Checkout completes a paid booking in a native build (not available in Expo Go).
- **Preconditions:** **EAS development build installed** + Razorpay keys. *If no build → set Test to `Blocked`, reason "requires EAS dev build".*
- **Steps:** Booking → native Razorpay sheet → pay (test key) → appointment `confirmed`; webhook confirms server-side.
- **Negative/edge:** Cancelled/failed payment recovery; tab/app backgrounding mid-payment.

#### MFQA-95 — Mobile native LiveKit video media (EAS dev build) — BLOCKED until build exists
- **Component:** Mobile · **Owner:** Both · **Priority:** P2 · **Labels:** mobile, eas-build, third-party, launch-blocker
- **Objective:** Native LiveKit media renders two-way audio/video in a native build (Expo Go only reaches token + pre-join UX).
- **Preconditions:** **EAS dev build** + `LIVEKIT_*`. *If no build → `Blocked`.*
- **Steps:** Join within window on device → two-way media with a web/second-device peer; camera/mic permissions handled.

### CROSS-CUTTING / UX

#### MFQA-100 — Loading skeletons, error/empty states, toasts, reduced-motion, boot loader
- **Component:** Cross-cutting/UX · **Owner:** Both · **Priority:** P2 · **Labels:** web, mobile, regression
- **Objective:** Every `(app)` route has a loading skeleton; async actions give feedback (toasts); reduced-motion respected (incl. `BootLoader` via `useSyncExternalStore`); empty/error states render.
- **Steps:** Throttle network → each route shows skeleton then content; trigger an action → toast; enable OS reduced-motion → animations calm; force an API error → friendly error, not a crash.

#### MFQA-101 — Design-system conformance vs `docs/Design.md` (web + mobile parity)
- **Component:** Cross-cutting/UX · **Owner:** Both · **Priority:** P2 · **Labels:** web, mobile
- **Objective:** Fonts, colors (cobalt/violet, no teal), spacing, glass/motion match `docs/Design.md`; mobile aligned to web (Geist, bold premium hero). Flag deviations as S4/S5 bugs.
- **Steps:** Spot-check key screens on web + mobile against `docs/Design.md`; log deviations.

---

## 4. Bug tickets (created during execution)

Bugs are filed **as they are found**, one per defect, using the §1.7 template, linked to
the failing Test via `blocks` / `is caused by`. Naming: `[BUG][<Component>] <symptom>`.

**Seed / carry-over bugs to open now** (from settled-but-unverified risk areas — verify, and
if reproduced, keep open; if clean, close as "not reproduced"):

- **MFQA-500 — [BUG][Payments] Verify webhook is idempotent under duplicate `payment.captured`** — S1 candidate. Confirm a replayed webhook does not double-confirm or double-charge. Link: MFQA-42.
- **MFQA-501 — [BUG][Booking] Expired-hold path leaves no orphan `pending_payment` row after lazy-cancel** — S2 candidate. Link: MFQA-41/43.
- **MFQA-502 — [BUG][Messaging] Deactivating Care mid-conversation must revoke thread access immediately** — S2 candidate. Link: MFQA-70.

*(These are verification placeholders, not confirmed defects — resolve each as Closed/Not-reproduced or keep Open with repro.)*

---

## 5. Smoke set (run before every retest of shared-logic fixes)

1. Patient login (MFQA-10) → 2. Book + mock/Razorpay pay (MFQA-42) → 3. Doctor issues Rx (MFQA-48) →
4. Patient sees Rx (MFQA-50) → 5. Concurrency spec green (MFQA-43) → 6. AuthZ specs green (MFQA-20/21).
Command: `npm run lint && npx tsc --noEmit && npm test && npx playwright test`.

---

## 6. Task / Improvement tickets (non-defect, missing setup or work)

#### MFQA-900 — [TASK][Deployment] Execute production deploy per `docs/Deployment.md`
- **Priority:** P0 · **Labels:** launch-blocker, deployment · **Owner:** Both
- Neon DB + `db:push`; Vercel env (all keys, no local URLs); LiveKit/Razorpay/Resend live; register Razorpay webhook; custom domain + `BETTER_AUTH_URL`; run `check:env:strict`. Exit = §6 post-deploy checklist in Deployment.md all ticked.

#### MFQA-901 — [TASK][Deployment] Doctor seed / promote in production
- **Priority:** P0 · **Labels:** launch-blocker, deployment · **Owner:** Both
- Doctor signs in once → `npm run promote-doctor <email>` (or SQL) → set fee/slot/timezone + availability. Blocks any real booking.

#### MFQA-902 — [TASK][Deployment] Host the realtime chat server (persistent Node) + wire `NEXT_PUBLIC_REALTIME_URL`
- **Priority:** P1 · **Labels:** deployment, third-party · **Owner:** Both
- Vercel can't hold a socket. Deploy `realtime/server.ts` to Railway/Fly/Render/VM with `DATABASE_URL`, `REALTIME_SECRET` (== app), `REALTIME_PORT`, `REALTIME_ALLOWED_ORIGINS`; TLS→wss. Verify `GET /` = `realtime ok`.

#### MFQA-903 — [TASK][Messaging] Add realtime socket-delivery E2E coverage
- **Priority:** P2 · **Labels:** e2e-covered · **Owner:** Both
- Only unit coverage exists for tokens/policy today; no automated socket-delivery test. Add an e2e that asserts live cross-client delivery + REST fallback.

#### MFQA-904 — [TASK][Care] Decide & implement refund-on-cancellation policy for consultations
- **Priority:** P1 · **Labels:** third-party · **Owner:** Tester A
- Tracker marks consultation refund-on-cancellation as **policy undecided / not built**. Decide policy, then implement or explicitly defer with a documented decision. (Care-plan cancellation refund IS implemented — MFQA-61.)

#### MFQA-905 — [TASK][Mobile] Produce an EAS development build for native payment + LiveKit testing
- **Priority:** P1 · **Labels:** eas-build, mobile · **Owner:** Both
- Unblocks MFQA-94 (native Razorpay) + MFQA-95 (native LiveKit media). Without it those Tests stay `Blocked`.

#### MFQA-906 — [TASK][Notifications] Confirm production scheduler invokes `/api/cron/reminders`
- **Priority:** P1 · **Labels:** deployment · **Owner:** Both
- `vercel.json` declares the cron (10 min) but production must actually run it with `CRON_SECRET`. Verify a real reminder fires post-deploy.

#### MFQA-907 — [TASK][Care] Weekly Care digest email (Resend) — build data assembler + cron
- **Priority:** P3 · **Labels:** third-party · **Owner:** Tester B
- Deferred in Tracker; not built. Ticket to track for post-launch.

#### MFQA-908 — [TASK][Mobile] Push notifications for new messages (`expo-notifications`)
- **Priority:** P3 · **Labels:** mobile · **Owner:** Both
- Not implemented; chat only updates while open. Track for post-launch.

#### MFQA-909 — [TASK][Ops] Object-storage plan for report + chat-attachment bytea growth
- **Priority:** P3 · **Labels:** deployment · **Owner:** Both
- `medical_reports` + chat attachments stored inline as Postgres bytea. Fine at single-doctor scale; document the S3/R2 swap trigger (isolated in `src/lib/reports.ts` + upload/download routes).

---

## 7. Release-readiness exit criteria (sign-off gate)

Launch is **GO** only when all are true:

1. **All P0 Tests `Passed`** and all P1 Tests `Passed` or explicitly waived with sign-off.
2. **Zero open `S1`/`S2` Bugs.** Open `S3`+ have owner + target and are accepted for launch.
3. **Automated gates green on the production build:** `npm run lint`, `npx tsc --noEmit`, `npm test` (76 tests), `npx playwright test` (all specs), `npm run check:env:strict`.
4. **Money path proven end-to-end:** a real ₹ test consultation booked, paid (Razorpay), webhook 200 in dashboard, appointment `confirmed`, receipt correct.
5. **Video proven:** doctor↔patient two-way media across two devices/networks (web; native via EAS if in scope).
6. **Security proven:** 401/403/IDOR specs green; env audit strict passes; `/api/cron/reminders` 401s without secret; realtime token + CORS enforced; attachment IDOR blocked.
7. **Email proven:** OTP + booking confirmation + reminder deliver via Resend on the deploy domain.
8. **Care/messaging gate proven:** paid-consult-only patient CANNOT message; active subscriber CAN; expired period revokes.
9. **Ops complete:** production deploy done (MFQA-900), doctor seeded (MFQA-901), realtime server hosted + reachable (MFQA-902), scheduler firing reminders (MFQA-906).
10. **Deployment post-deploy checklist** (`docs/Deployment.md §6`) fully ticked.

---

## 8. Coverage map — automation vs manual

| Area | Automated (spec) | Manual-only in this cycle |
|---|---|---|
| Auth/session | `auth.spec.ts` | cross-browser, Google, email delivery |
| AuthZ/IDOR/validation | `authorization`, `route-guards`, `idor`, `validation` | manual IDOR probes, attachment IDOR e2e |
| Booking/slots/concurrency | `booking.spec.ts`, `concurrency.spec.ts`, `slots/booking.test.ts` | hold-expiry path, reschedule UI |
| Payments | `payments.test.ts` (signature) | live Razorpay popup, webhook, tab-close recovery |
| Consult/Rx | `consult.spec.ts`, `call-window.test.ts` | real video media, Rx 409, outcomes UI |
| Refills/follow-ups | `refills-followups.spec.ts` | queue UI |
| Care/messaging gate | `care-plan.spec.ts`, `chat-policy`, `care-subscription-policy`, `realtime-token` tests | cancellation UI parity, live socket delivery, mobile chat |
| Email/reminders | — | all (third-party) |
| Mobile | — | all (device / EAS) |
| UX/design | — | all (manual review vs Design.md) |
</content>
</invoke>
