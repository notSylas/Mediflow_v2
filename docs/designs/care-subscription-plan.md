---
status: DRAFT
---
# Implementation Brief: MediFlow Care Plan (Subscription)

Authored 2026-06-28. Branch: main.

## Summary

Add a **MediFlow Care Plan** subscription that unlocks ongoing-care features
without replacing the paid video consultation. Subscription is the *between-visits*
relationship; the paid video consult remains the *visit*. The two are
complementary revenue/engagement surfaces, never substitutes.

This is a web + mobile + backend change. Billing v1 is a **mock/admin toggle** —
no Razorpay recurring billing yet (see [Out of scope](#out-of-scope--non-goals)).

### Decisions locked before this brief (do not re-litigate)

- **Scope:** web + mobile + backend.
- **Billing v1:** mock/admin activation only. No real recurring payment.
- **Messaging:** active subscribers can message the doctor anytime, even with
  **no prior booking**.
- **Plan model:** one plan only (`MediFlow Care`). Not tiers.

These align with the current product decision: messaging is gated by an
**active MediFlow Care subscription only**. A one-off paid consultation does not
unlock ongoing chat. The single-doctor-but-multi-ready posture holds —
subscriptions reference
`doctor_profiles.id`, so multi-doctor later is an insert, not a migration.

---

## Copy rules (apply everywhere subscription messaging is promoted)

These are non-negotiable and must appear in every messaging entry point and
every care-plan promo surface:

- **Never** promise instant doctor replies.
- Always show the disclaimer: **`Messaging is not for emergencies.`**
- Use reassurance wording like: **`Doctor usually replies within clinic hours.`**

This mirrors the existing triage/consent posture in the codebase (see
`src/lib/triage.ts` and the `consent*` columns on `appointments`) — we set
expectations honestly and record the safety language, we don't imply a 24/7
clinical channel.

---

## Features unlocked by an active subscription

| Feature | Backed by |
|---|---|
| Secure patient↔doctor messaging without a prior booking | `conversations` / `messages` + new gate (see below) |
| One monthly follow-up / check-in credit (async) | new `care_subscriptions.followUpCreditsUsed` + `appointments.mode = 'async'` |
| Weekly care digest | new digest assembler (read-only over existing tables) |
| Medicine reminders from active prescriptions | `prescription_medicines` + new `reminderPrefs` |
| Easier prescription refill requests | existing `refill_requests` (surfaced as a plan benefit) |
| Priority booking label + optional priority slot highlighting | UI label only in v1 (no slot-engine change) |
| Subscriber badge visible to doctor | new subscription status on patient surfaces |
| Care plan status visible in patient home/settings | new patient home/settings sections |

The monthly follow-up is an **async check-in/review request**, not a guaranteed
video consult. It reuses the existing `appointment_mode = 'async'` path already
in the schema (`async = doctor-initiated / refill, no live call`).

---

## Backend changes

### 1. New schema (`src/db/schema.ts`)

Add a subscription entity per patient. One row per patient↔doctor pair, matching
the `conversations` pattern so multi-doctor stays a clean insert.

```ts
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "inactive",
  "cancelled",
  "manual_trial",
]);

export const careSubscriptions = pgTable(
  "care_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    status: subscriptionStatus("status").notNull().default("inactive"),
    // Current billing/care period. In v1 these are set by the admin toggle;
    // later they come from the Razorpay subscription webhook.
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    // Monthly follow-up credit accounting, reset each period.
    followUpCreditsUsed: integer("follow_up_credits_used").notNull().default(0),
    // Patient-controlled preferences (also surfaced on the profile screen).
    digestEnabled: boolean("digest_enabled").notNull().default(true),
    medicineRemindersEnabled: boolean("medicine_reminders_enabled")
      .notNull()
      .default(true),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_care_subscription_pair").on(t.patientId, t.doctorId)]
);
```

Optional but recommended: a `care_followup_requests` table to track the monthly
async check-in distinctly from doctor-recommended `follow_ups` (which are
doctor-created, not patient-initiated, per the schema comment). Reusing
`follow_ups` would blur two different concepts. Prefer a small new table:

```ts
export const careFollowUpRequests = pgTable("care_followup_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => careSubscriptions.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => user.id),
  doctorId: uuid("doctor_id").notNull().references(() => doctorProfiles.id),
  // The async appointment created to service this request, once doctor acts.
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  note: text("note"),
  status: followUpStatus("status").notNull().default("pending"), // reuse enum
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

After editing the schema: `npm run db:generate` then `npm run db:push` (per
`AGENTS.md` Dev section; DB is the Docker container `mediflow-v2-pg` on :5433).

### 2. Subscription state helpers (`src/lib/care-subscription.ts` — new)

Mirror the split used by chat: pure decision functions in a `*-policy` file,
DB access in the data file (see `src/lib/chat-policy.ts` ↔ `src/lib/chat.ts`).

- `isSubscriptionActive(sub, now)` — pure: `status === 'active' || 'manual_trial'`
  **and** `now` within `[currentPeriodStart, currentPeriodEnd]`.
- `followUpAvailable(sub)` — pure: `followUpCreditsUsed < 1` for the period.
- `getActiveSubscription(patientId, doctorId)` — DB read.

### 3. Messaging access — the one critical gate

Messaging access must go through a single `patientCanMessageDoctor(patientId,
doctorId)` decision. That decision returns true only when
`isSubscriptionActive(...)` passes for the patient and doctor. Appointment status
must not be used as a durable messaging unlock.

Add unit/API coverage:
- active subscription, no booking → allowed
- inactive subscription, no booking → denied
- paid consultation, no subscription → denied
- cancelled subscription → denied

Do **not** weaken attachment ownership (`attachmentUsableBy`) — that stays
uploader+conversation bound regardless of subscription.

### 4. Admin / doctor-only toggle (v1 billing stand-in)

New doctor-scoped endpoints (under `src/app/api/v1/doctor/...`, guarded by the
existing doctor role guard — see `src/lib/api-auth.ts`):

- `POST .../care-subscriptions/[patientId]/activate` — set `active`, stamp
  `currentPeriodStart = now`, `currentPeriodEnd = now + 1 month`, reset
  `followUpCreditsUsed = 0`.
- `POST .../care-subscriptions/[patientId]/deactivate` — set `inactive` (or
  `cancelled` + `cancelledAt` when the patient cancels).
- `POST .../care-subscriptions/[patientId]/reset-credit` — set
  `followUpCreditsUsed = 0` (manual nicety; also happens on period roll).

### 5. Monthly follow-up credit behavior

- `POST /api/v1/patient/care/follow-up` — patient requests their one monthly
  async check-in. Server asserts `isSubscriptionActive` **and**
  `followUpAvailable`; on success creates a `care_followup_requests` row and
  increments `followUpCreditsUsed`. Idempotent per period (second call → 409 with
  "Follow-up already used this period").
- Doctor sees the request in the **work queue**
  (`src/app/api/v1/doctor/work-queue/route.ts` + `/doctor/work-queue`). Fulfilling
  it creates an `async` appointment / prescription path that already exists
  (`src/app/api/v1/doctor/async-consult`).
- Credit is consumed until the next period. A period roll (cron, below) resets
  `followUpCreditsUsed` to 0 when `now > currentPeriodEnd` for active rows.

### 6. Weekly digest

Add a read-only assembler (`src/lib/care-digest.ts`) that, for an active
subscriber, gathers:

- upcoming visit (next `appointments` row)
- active medicines (from latest issued `prescription_medicines`)
- prescriptions issued this week
- unread message count (`conversations.patientUnread`)
- pending follow-up (this period's `care_followup_requests`)
- refill status (`refill_requests`)
- profile completeness (`patient_profiles` filled-field ratio)

The assembler is the **single source of truth** for digest content; it feeds
both the in-app digest view and the **weekly email**.

**Delivery — email (Resend).** The digest is sent as a weekly email via the
existing Resend integration (`src/lib/email.ts`), the same channel used for OTP /
booking confirmation / reminders. A new cron job
(`src/app/api/cron/care-digest`, registered like the existing
`src/app/api/cron/reminders`) runs weekly — default **Sunday morning** in the
doctor timezone (`Asia/Kolkata`) — and for each active subscriber with
`digestEnabled = true`:

- builds the digest via `care-digest.ts`,
- renders a `careDigest` email template (add to `src/lib/email.ts`),
- sends it through Resend.

Notes:
- The in-app digest view (patient home / `View weekly digest`) reads the **same
  assembler** so email and app never diverge.
- **Empty state:** a week with nothing new sends a short "Nothing new this week"
  digest rather than a blank/broken email or skipping silently — same explicit
  empty-state rule the doctor weekly digest follows in
  `docs/designs/launch-readiness-and-expansion.md`.
- Respect `digestEnabled` (patient profile/settings toggle) — opted-out
  subscribers get the in-app view but no email.
- Like other emails in this project, Resend is best-effort: log send failures
  (`src/lib/logger.ts`), don't block on them, and never include emergency-channel
  language (the digest is informational, not a support inbox).
- The email send is **idempotent per week** — guard against the cron firing twice
  (e.g. a `lastDigestSentAt` timestamp on `care_subscriptions`, checked before
  send), mirroring how `appointments.reminderSentAt` stops double-sends.

> Add `lastDigestSentAt timestamp` to the `care_subscriptions` schema above for
> the idempotency guard.

### 7. Period roll cron

Extend the existing cron surface (`src/app/api/cron/...`, currently
`reminders`) with a daily care-period job: for active subscriptions past
`currentPeriodEnd`, advance the period window and reset `followUpCreditsUsed`.
No Razorpay; this is the mock-billing clock.

### Out of scope / non-goals

- **No Razorpay recurring billing** this phase (no plan/subscription objects, no
  recurring webhook). Activation is admin/mock only. The schema columns
  (`currentPeriod*`) are shaped so a real subscription webhook can populate them
  later without migration.
- Subscription does **not** replace paid video consults.
- Monthly follow-up is async review, **not** a guaranteed video consult.
- No multiple tiers.

---

## Required page changes

Paths below are real. Web pages live under `src/app/(app)/...`; mobile screens
under `mobile/src/app/...`.

### Patient — Mobile

| Screen | File | Change |
|---|---|---|
| Home | `mobile/src/app/(patient)/index.tsx` | Add a calm `MediFlow Care` card **below** the main visit hero. Unsubscribed → benefits + `Start care plan`. Subscribed → plan status, next follow-up credit, digest status, messaging shortcut. |
| Messages | `mobile/src/app/(patient)/messages.tsx` | Subscribed → open chat directly. Not subscribed + no booking → subscription unlock card. Not subscribed + has booking → keep existing booked-consult access, but note subscription gives *ongoing* access. Disclaimer copy on every state. |
| Visits | `mobile/src/app/(patient)/book/index.tsx` | Small subscriber note near booking CTA: `Care members get priority booking support.` |
| Prescriptions | `mobile/src/app/(patient)/prescriptions.tsx` | Show refill request as a care-plan benefit. Unsubscribed → normal Rx viewing + `Care plan includes easier refill requests`. |
| Settings | `mobile/src/app/(patient)/settings.tsx` | New `MediFlow Care Plan` section: status, renewal period, included benefits, cancel/help copy. |
| Profile | `mobile/src/app/(patient)/profile.tsx` | Optional reminder preferences (medicine reminders, weekly digest) → write `care_subscriptions.medicineRemindersEnabled` / `digestEnabled`. |

### Doctor — Mobile

| Screen | File | Change |
|---|---|---|
| Home | `mobile/src/app/(doctor)/index.tsx` | Subscriber count + care-plan work items; show monthly follow-up requests in the work queue summary. |
| Patients | `mobile/src/app/(doctor)/patients.tsx` | `Care member` badge + filter. |
| Patient detail | `mobile/src/app/(doctor)/patients/[id].tsx` | Subscription status, remaining monthly follow-up credit, recent digest summary, care-plan activity. |
| Messages | `mobile/src/app/(doctor)/messages.tsx`, `messages/[id].tsx` | Care-member badge in conversation list + header. |
| Work queue | `mobile/src/app/(doctor)/work-queue.tsx` | Section for subscriber follow-up requests + digest-triggered care flags. |

### Patient — Web (mirror mobile)

| Surface | File |
|---|---|
| Care plan card on dashboard | `src/app/(app)/patient/page.tsx` |
| Subscription unlock state on messages | `src/app/(app)/messages/page.tsx` |
| Subscription section in settings | `src/app/(app)/patient/settings/page.tsx` |
| Care benefits near prescriptions/refills | `src/app/(app)/patient/prescriptions/page.tsx` |
| Reminder prefs | `src/app/(app)/patient/profile/page.tsx` |

### Doctor — Web (mirror mobile)

| Surface | File |
|---|---|
| Subscriber badge in patient list/detail | `src/app/(app)/doctor/patients/page.tsx`, `patients/[id]/page.tsx` |
| Subscriber filter | `src/app/(app)/doctor/patients/page.tsx` |
| Care-plan work queue items | `src/app/(app)/doctor/work-queue/page.tsx` |
| Messaging badge/context | `src/app/(app)/messages/page.tsx` |

---

## UI direction

Per `docs/Design.md` ("Premium Clinical Glass") — read it before any visual work.
Care plan is a **quiet** premium surface, not a sales banner.

- **Name:** `MediFlow Care`.
- **Card:** soft blue/white, subtle border, gentle elevation — *not* the diagonal
  gradient-wash hero treatment (that budget is reserved for booking/payment/
  schedule hero surfaces per Design.md). The care card sits below the hero and
  must not compete with it.
- **Patient identity color** is deep cobalt `oklch(0.46 0.19 258)`; doctor side
  flips to violet `oklch(0.42 0.2 303)` automatically via `.theme-doctor`. Don't
  hardcode role colors — use the existing primary/accent tokens.
- **Subscriber badge:** small, calm, green/blue, with text (color is never the
  only signal — accessibility rule in Design.md). Green `--success` is reserved
  for paid/confirmed semantics, so prefer a calm **blue** chip for the badge to
  avoid implying payment state.
- **Icon:** shield-heart, calendar-heart, or message-heart (lucide).
- **Type:** Geist; any ₹/period numerals use Geist Mono tabular.
- **Disclaimer styling:** muted, always present, never dismissible on messaging
  promos.
- **CTAs:** `Start care plan` · `View care benefits` · `Message doctor` ·
  `Use monthly follow-up` · `View weekly digest`.

### Copy blocks

Patient card (unsubscribed):

```text
MediFlow Care
Stay connected between visits.

Includes secure messaging, one monthly follow-up,
weekly care digest, medicine reminders, and refill support.

Messaging is not for emergencies.

[Start care plan]
```

Patient card (subscribed):

```text
MediFlow Care active
Your ongoing care plan is active.

1 monthly follow-up available
Weekly digest ready every Sunday
Messaging enabled — doctor usually replies within clinic hours.

Messaging is not for emergencies.

[Message doctor] [Use follow-up]
```

Doctor patient badge:

```text
Care member
Messaging enabled · follow-up credit available
```

---

## Test plan

Extend the existing e2e suite (5 specs green today) and unit tests.

- Patient with **no** subscription and **no** booking cannot message until they
  start the care plan.
- Patient with **active** subscription can message with **no** booking.
- Patient with **inactive** subscription sees the locked messaging state.
- Patient with a paid booking but no subscription is still blocked from
  messaging.
- Doctor can identify care-plan patients (badge + filter).
- Monthly follow-up credit can be used **once** per period; second attempt is
  rejected; period roll resets it.
- Weekly digest renders correctly with **empty** and **populated** patient data,
  in both the in-app view and the email template (same assembler output).
- Digest email respects `digestEnabled` (opted-out subscriber gets no email) and
  is not sent twice in one week (idempotency guard).
- Mobile and web show **consistent** plan status from the same API.
- Emergency disclaimer (`Messaging is not for emergencies.`) appears on every
  surface that promotes subscription messaging.
- Existing appointment booking/payment flow is **unchanged**.

---

## Assumptions

- v1 uses mock/admin activation, not real subscription billing.
- One plan only: `MediFlow Care`.
- Subscription enables messaging but does **not** replace paid video consults.
- Monthly follow-up = async check-in/review, not a guaranteed video consult.
- Real Razorpay recurring billing is a later phase, after product validation —
  the schema is shaped to absorb it without migration.

---

## Suggested build staging

1. **Schema + backend gate** — `care_subscriptions` table, `care-subscription.ts`
   + `-policy.ts`, the unified `patientCanMessageDoctor` gate, admin toggle
   endpoints, unit tests. (No UI yet; messaging now openable via active sub.)
2. **Follow-up + digest** — credit endpoint, `care_followup_requests`, work-queue
   wiring, digest assembler, weekly Resend email (`careDigest` template +
   `cron/care-digest`), and period-roll cron.
3. **Patient UI** — mobile then web (home card, messages states, settings,
   prescriptions note, profile prefs).
4. **Doctor UI** — badges, filter, patient detail, work-queue section.
5. **e2e + disclaimer audit** — full test plan; update `docs/Tracker.md` and add
   a Decisions Log entry in `docs/Design.md` for the care card treatment.

Keep each stage its own PR for review/blast-radius (the convention used in
`docs/designs/launch-readiness-and-expansion.md`).
