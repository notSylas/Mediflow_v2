# MediFlow — Doctor Journey (Level 2: Technical)

Authored 2026-08-12. Exact APIs, database tables, and implementation
reality behind every doctor-facing feature in
[doctor-journey.md](doctor-journey.md). File paths are repo-relative.
Companion: [patient-technical.md](patient-technical.md).

## 1. Global chrome

`web/app/(app)/layout.tsx` renders the sidebar (`web/components/nav/
Sidebar.tsx`, driven by `web/components/nav/nav-items.ts`) and a
site-wide `NextConsultBanner` that polls `GET /api/doctor/next-consult`
every 60s. Auth gating for every doctor page is `requireDoctorSession()`
(`backend/auth/api-auth.ts`) — session must exist **and**
`session.user.role === "doctor"`, a field that's `input: false` in the
Better Auth config (see patient-technical.md §1) and therefore cannot be
set by any client payload.

## 2. Dashboard — `web/app/(app)/doctor/page.tsx`

Pure server component, no client fetches. Direct lib calls:
`listDoctorAppointments`, `getDoctorRevenueInPaise`,
`getOrCreateDoctorProfile` (`backend/booking/appointments.ts`,
`backend/people/doctor.ts`), `listDoctorConversations`
(`backend/messaging/chat.ts`), `listDoctorPendingFollowUps`
(`backend/care/follow-ups.ts`), `listPendingRefillRequests`
(`backend/care/refills.ts`), `countActiveSubscribers` +
`listPendingCareFollowUps` (`backend/care/care-subscription.ts`), plus a
direct `db.select` on `availabilityRules`. Tables read: `appointments`,
`prescriptions`, `availabilityRules`, `conversations`, `followUps`,
`refillRequests`, `careSubscriptions`, `careFollowUpRequests`.

Mobile equivalent (`GET /api/v1/doctor/home`) aggregates the same set of
lib calls into one JSON payload for the client-fetch home screen.

## 3. Appointments

| Surface | Route | Notes |
|---|---|---|
| Web list | server component, `listDoctorAppointments` | search `q`, status filter, `count` pagination |
| Mobile list | `GET /api/v1/doctor/appointments` | thin wrapper, same lib call |
| No-show | `POST /api/appointments/[id]/status {status:"no_show"}` | web: `AppointmentQuickActions`; mobile: on the encounter screen |
| Cancel | `POST /api/appointments/[id]/cancel` | gated by `canCancelAppointment` (`backend/booking/booking.ts`) |
| Complete | `POST /api/appointments/[id]/status {status:"completed"}` | `OutcomeButtons`, confirm dialog surfaces documentation warnings |

## 4. Schedule / Availability

| Action | Route |
|---|---|
| Weekly rule create | `POST /api/doctor/availability/rules` |
| Weekly rule delete | `DELETE /api/doctor/availability/rules/[id]` |
| Date override create | `POST /api/doctor/availability/overrides` |
| Date override delete | `DELETE /api/doctor/availability/overrides/[id]` |

Both web (`AvailabilityRulesEditor`/`OverridesEditor`/`DayBlockToggle`)
and mobile (`schedule.tsx`'s `HoursEditorSheet`/`ExceptionSheet`) call the
same four endpoints — the divergence noted in the Level 1 doc is purely
*where* the editing UI lives, not a different backend contract. Free
slots for booking are computed by `backend/booking/slots.ts` from
`availabilityRules` − `availabilityOverrides` − non-cancelled
`appointments`, at query time, every time — never materialized.

## 5. Encounter

| Action | Route |
|---|---|
| Load encounter data | web: direct `getEncounterData`/`getPatientHistory`/`getMedicineHistory`/`getPatientProfile` calls (server component). Mobile: `GET /api/v1/doctor/encounters/[id]`, same underlying functions, aggregated into one payload. |
| SOAP autosave | `PUT`/`POST /api/appointments/[id]/consult-note` → upserts `consultNotes` |
| Prescription draft save | `PUT /api/appointments/[id]/prescription` |
| Prescription issue (lock) | `POST /api/appointments/[id]/prescription/issue` — flips `prescriptions.status` `draft → issued`, sets `issuedAt`; **no route exists to un-issue or edit after this** at any layer, by design (Rules.md #4) |
| Follow-up recommendation | web: `createFollowUpAction` server action; mobile: `POST /api/v1/follow-ups` — both call the same `createFollowUp` lib function (`backend/care/follow-ups.ts`), which deletes any existing pending follow-up for the same source appointment before inserting the new one |

Mobile's "workflow checklist" (review snapshot / save SOAP / Rx decision
/ follow-up decision / red-flag reviewed) is **client-only component
state** — not persisted to the backend, resets on screen reload. Only the
SOAP save, the follow-up row, and the eventual status change are real,
durable state.

## 6. Patients roster & detail

| Surface | Route | DTO richness |
|---|---|---|
| Web roster | server component, `listDoctorPatients` + `getActiveSubscriberIds` | base fields + care-member flag |
| Mobile roster | `GET /api/v1/doctor/patients?q=` | materially richer — adds `upcomingCount`, `pendingRxCount`, `triageCount`, `pendingFollowUpCount`, `pendingRefillCount`, `reportCount`, `unreadMessageCount`, `hasRiskProfile` per patient, driving mobile's 9-way filter set |
| Web detail | server component | `getPatientHistory`, `getMedicineHistory`, `getPatientProfile`, `getDoctorPatientCareStatus`, plus direct queries on `followUps`/`refillRequests`/`medicalReports`/`conversations` |
| Mobile detail | `GET /api/v1/doctor/patients/[id]` | same underlying data, one aggregated payload |
| Start async consult | web: `startAsyncConsultAction` (server action) → redirects to `/doctor/encounter/[id]`. Mobile: `POST /api/v1/doctor/async-consult {patientId}` → routes straight to `prescribe/[id]`, skipping the encounter screen. | `createAsyncConsult` lib function underneath both |

## 7. Refill requests (`refillRequests` table, schema.ts:453-466)

Patient-initiated, tied to a specific **issued** `prescriptionId`, status
`pending|fulfilled|declined`. `createRefillRequest` de-dupes an existing
pending request for the same prescription — no per-period limit, unlike
Care follow-up credits.

**Not gated by Care subscription in code** — `POST
/api/v1/patient/refill-requests` has no subscription check, despite being
described as a Care benefit in patient-facing copy.

| Route | Purpose |
|---|---|
| `GET /api/v1/doctor/refill-requests` | list pending |
| `POST /api/v1/doctor/refill-requests/[id]/fulfill` | `createAsyncConsult` + `setRefillRequestStatus("fulfilled")`; web redirects to the encounter, mobile routes straight to `prescribe/[id]` |
| `POST /api/v1/doctor/refill-requests/[id]/decline` | `setRefillRequestStatus("declined")` |
| `POST /api/v1/patient/refill-requests` | patient creates one |

## 8. Follow-ups — three distinct systems, kept separate deliberately

1. **`followUps`** (schema.ts:421-443) — doctor-created, `dueAt`,
   `dismissFollowUp`/`snoozeFollowUp(days)` (doctor side),
   `setFollowUpStatus(id, patientId, "booked"|"dismissed")` (patient
   side). Not Care-gated.
2. **`refillRequests`** — covered above.
3. **`careFollowUpRequests`** (schema.ts:513-537) — patient-initiated,
   tied to `subscriptionId` and `periodStart`, the **only** one of the
   three actually consuming a Care subscription's monthly credit
   (`requestFollowUp` in `care-subscription.ts`, transactional
   conditional-increment of `followUpCreditsUsed` to guard concurrent
   double-spend).

Work-queue actions: web (`web/app/(app)/doctor/work-queue/page.tsx`) uses
`"use server"` form actions for every category (`markMessageReadAction`,
`declineRefillRequestAction`, `fulfillCareFollowUpAction`/
`dismissCareFollowUpAction`, `snoozeFollowUpAction`/`dismissFollowUpAction`
— all in `web/app/(app)/doctor/actions.ts`). Mobile
(`GET /api/v1/doctor/work-queue`) is a client-fetch screen; only Care
follow-ups get an inline action (`POST /api/v1/doctor/care-follow-ups/[id]
{action}`) — refills, unread messages, and doctor follow-ups are
tap-through only on mobile.

## 9. MediFlow Care — implementation reality

### Schema (`backend/db/schema.ts:478-538`)
- `careSubscriptions`: unique on `(patientId, doctorId)`. `status` enum
  `active|inactive|cancelled|manual_trial`. `digestEnabled`/
  `medicineRemindersEnabled` booleans, default `true` — **stored and
  toggleable, but nothing in the codebase reads them to actually send
  anything.**
- `careFollowUpRequests`: `periodStart` enforces the one-per-period rule
  even across a period roll.
- No `lastDigestSentAt` column exists — the original design brief called
  for one specifically to guard against double-sending a digest email;
  it was never added, consistent with the digest never being built.

### Policy (`backend/care/care-subscription-policy.ts`)
- `isSubscriptionActive(sub, now)` = status ∈ `{active, manual_trial}`
  **and** `now` within `[currentPeriodStart, currentPeriodEnd]` — an
  `active`-status row with an elapsed period is functionally inactive.
- `followUpAvailable(sub)` = `followUpCreditsUsed < 1`.
- `computeCancellationBreakdown` — pure pro-ration (7 working-day refund
  window), backs `GET /api/v1/patient/care/cancellation`.

### Data layer (`backend/care/care-subscription.ts`)
- `activateSubscription` — upsert via `onConflictDoUpdate`, opens a fresh
  period from `now`, resets credit, clears `cancelledAt`. Same function
  serves the doctor's "Grant trial/Activate" toggle and the patient's
  self-serve "Start care plan."
- **`rollElapsedPeriods(now)` is defined but has zero call sites anywhere
  in the codebase** (confirmed by grep). No `web/app/api/cron/care-*`
  route exists — the only cron route in the app is `/api/cron/reminders`
  (appointment reminders, unrelated). **Consequence**: an elapsed active
  subscription does not automatically roll to a new period or reset its
  follow-up credit. It stays exactly as it lapsed until a doctor manually
  reactivates it (or the patient resubscribes), which re-opens a fresh
  period as a side effect of `activateSubscription`.

### Messaging gate (`backend/messaging/chat.ts`)
- `patientCanMessageDoctor` = `patientHasActiveSubscription(...)` — the
  single gate; appointment status is never consulted.
- `listDoctorConversations` **inner-joins `careSubscriptions`** filtered
  to active status + current period — a doctor's conversation list
  *already* only contains active members. This makes the `isMember` flag
  computed on top of it in `GET /api/v1/conversations` and consumed by
  `mobile/web/app/(doctor)/messages.tsx` effectively always `true` today
  — a harmless but redundant computation, not a bug, worth knowing if
  touching that code.

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/patient/care` | GET/POST/DELETE/PATCH | status / self-activate (mock, no payment) / cancel / update digest+reminder prefs |
| `/api/v1/patient/care/cancellation` | GET | pro-rated breakdown before cancel |
| `/api/v1/patient/care/follow-up` | POST | spend monthly credit; 403 not-subscribed, 409 already-used |
| `/api/v1/doctor/care-subscriptions` | GET | subscriber list + counts |
| `/api/v1/doctor/care-subscriptions/[patientId]` | POST | `activate\|trial\|deactivate\|reset-credit` |
| `/api/v1/doctor/care-follow-ups/[id]` | POST | `fulfill` (opens async consult) or `dismiss` |

### Gap summary — what the design brief describes that isn't live

| Feature | Status |
|---|---|
| Mock/admin billing toggle | ✅ built, matches brief |
| Single messaging gate | ✅ built, matches brief |
| Monthly follow-up credit, end to end | ✅ built, matches brief |
| Subscriber badge/filter/detail surfacing | ✅ built, matches brief |
| Cancellation pro-ration | ✅ built, matches brief |
| Weekly digest email | ❌ not built — no `care-digest.ts`, no cron route, no `lastDigestSentAt` column |
| Automatic period roll | ❌ `rollElapsedPeriods` exists, zero call sites |
| Medicine reminders | ❌ preference stored, no consuming logic anywhere |
| "Grant new subscription" from mobile | ❌ web-only — no equivalent mobile route/screen |

## 10. Settings

`PATCH /api/doctor/profile` supports the full `doctorProfiles` field set
(specialty, bio, fee, Care price, slot minutes, timezone, plus the
Phase-1 marketplace/trust fields: `photoUrl`, `qualifications`,
`registrationNo`, `yearsExperience`, `languages` — schema.ts:122-162).
Web's `ProfileForm` component only submits the first group; mobile's
settings screen submits all of them. Same endpoint, same validation,
different form coverage — a UI gap, not a backend one.

## 11. Cross-reference: shared mechanisms

Everything in patient-technical.md §9 (the three independent HMAC
schemes, the repeated session→ownership→short-lived-credential pattern,
the absence of general-purpose rate limiting beyond Better Auth's login
endpoints) applies identically on the doctor side — `requireDoctorSession`
is `requireSession` plus one extra role check, not a separate security
model.
