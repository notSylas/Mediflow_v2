# MediFlow v2 — Feature Tracker

Live status board. Update when state changes. Last updated: 2026-06-18.

Legend: ✅ done · 🔨 in progress · 🔜 planned (v1) · 🧊 v1.5 · ❌ cut

## Foundation

| Feature | Status | Notes |
|---|---|---|
| Next.js 16 + TS + Tailwind 4 scaffold | ✅ | |
| Postgres (Docker :5433) + Drizzle schema | ✅ | `npm run db:push` |
| Auth: email OTP | ✅ | OTP logged via pino until Resend |
| Auth: Google sign-in | ✅ | Activates when `GOOGLE_*` env set |
| Roles (patient/doctor) + route guards | ✅ | |
| Logging (pino) + optional Sentry | ✅ | |

## Doctor side

| Feature | Status | Notes |
|---|---|---|
| Profile (specialty, bio, fee, slot length, timezone) | ✅ | `/doctor` |
| Weekly availability rules editor | ✅ | |
| Date overrides (block/extra) | ✅ | |
| Appointments list (Today/Upcoming/Past) | ✅ | `/doctor/appointments` |
| Encounter: SOAP note editor | ✅ | |
| Encounter: structured prescription (draft→issue→lock) | ✅ | |
| Encounter: returning-patient history (consults + prescriptions + medicines) | ✅ | |
| Mark completed / no-show | ✅ | With toasts |
| Header nav | ✅ | Dashboard · Schedule · Appointments · Patients · Availability |
| Dashboard (stats, next patient, today, setup checklist) | ✅ | `/doctor` |
| SOAP autosave (debounced, flush on tab-hide) | ✅ | No save button |
| Patients roster + per-patient history | ✅ | `/doctor/patients`, searchable |
| Week schedule view (availability + bookings) | ✅ | `/doctor/schedule` |
| Appointments search/status filter/load-more | ✅ | |
| Waiting-room presence badge | ✅ | Needs LiveKit env; silent otherwise |
| Next-consult reminder banner | ✅ | App-wide, 15-min lookahead |
| Toasts (sonner) + skeletons + reduced-motion | ✅ | |

## Patient side

| Feature | Status | Notes |
|---|---|---|
| Booking: intake (visit reason, symptoms, report upload) | ✅ | |
| Booking: live slot picker | ✅ | |
| Booking: hold (10 min) + DB double-booking guard | ✅ | |
| Booking: payment step | ✅ | Mock in dev/e2e; Razorpay when keys set |
| Booking: confirmation + refresh-safe resume | ✅ | `?appointment=<id>` |
| My appointments list + cancel (2h window) | ✅ | |
| Appointment detail (join, outcome, prescription) | ✅ | |
| Prescriptions list | ✅ | |
| Home (next appointment + book CTA) | ✅ | |

## Consultation

| Feature | Status | Notes |
|---|---|---|
| LiveKit token endpoint (participant + time-window gated) | ✅ | 503 when unconfigured |
| Call page with pre-join device check | ✅ | `/call/[id]` |
| Join buttons (patient + doctor, window-aware) | ✅ | |

## Payments

| Feature | Status | Notes |
|---|---|---|
| Mock provider (dev/e2e) | ✅ | |
| Razorpay order + Checkout + signature verify + webhook | ✅ | Webhook is authoritative; client callback best-effort |
| Refund on cancellation | 🔜 | Policy undecided |

## Quality & launch

| Feature | Status | Notes |
|---|---|---|
| Unit tests (slots, booking rules, call window, payment signatures) | ✅ | Vitest, 36 tests |
| E2E: auth + booking | ✅ | Playwright, production build, DB truncated per run |
| E2E: consult + prescription + returning patient | ✅ | Full clinic loop in one spec |
| E2E: full suite green after UI overhaul | ✅ | 6/6 — caught a real logout regression (2026-06-13) |
| Vercel cron config + doctor-promote script | ✅ | `vercel.json`, `npm run promote-doctor` |
| Emails (OTP, confirmation, reminder) | 🔜 | Resend — last 🔜 before launch |
| Deployment guide | ✅ | `docs/Deployment.md` |
| Production deploy | 🔜 | Follow `docs/Deployment.md` |
| Doctor seed script | 🔜 | |

## Patient experience (added 2026-06-13)

| Feature | Status | Notes |
|---|---|---|
| Patient medical profile (DOB, allergies, conditions, meds, emergency contact) | ✅ | Surfaced in doctor encounter snapshot |
| Profile-completion nudge on home | ✅ | |
| Account settings (name, change password) | ✅ | `/patient/settings`, header link |
| Reschedule a confirmed appointment | ✅ | Slot picker dialog |
| Emails via Resend (OTP, booking confirmation) | ✅ | Console fallback when key unset |
| Reminder cron endpoint | ✅ | `/api/cron/reminders` — needs a scheduler |
| Emergency red-flag triage at intake | ✅ | Unit-tested |
| Telemedicine consent at booking | ✅ | Required checkbox |
| Terms + Privacy pages | ✅ | `/terms`, `/privacy` |
| Patient receipt (print/PDF) | ✅ | Per paid appointment |

## Redesign P0 — safety & workflow clarity (2026-06-13)

| Item | Status | Notes |
|---|---|---|
| Auditable consent persisted + server-enforced | ✅ | version/timestamp/source on appointment; server sets version |
| Server-side triage recheck | ✅ | re-runs red-flag check; records triageFlaggedAt; warns (block undecided) |
| Irreversible-action safety (issue / complete / no-show) | ✅ | confirm dialogs + completion warnings; no-show separated |
| Consolidated status labels | ✅ | `src/lib/appointment-status.ts` — patient 'Missed' vs doctor 'No-show' |
| Loading skeletons on every route | ✅ | all (app) routes now have loading.tsx |
| Nav-feedback audit | ✅ | no feedback-less async actions found |

Verified: 40 unit tests + 6 e2e specs green (e2e run before this doc edit). Caught a
real stale-closure booking bug during P0.1.

## Mobile app (Expo) — kickoff (2026-06-13)

| Item | Status | Notes |
|---|---|---|
| Expo project scaffolded (`mobile/`, SDK 54, Expo Router, TS) | ✅ | Expo Go 54.0.8 compatible; scheme `mediflow`, bundle `com.mediflow.app` |
| Backend trustedOrigins for mobile | ✅ | `mediflow://` + dev `exp://`; server `expo()` plugin deferred (no social login) |
| Better Auth Expo client + SecureStore | ✅ | `mobile/src/lib/auth.ts` |
| Typed API client (cookie-attached fetch) | ✅ | `mobile/src/lib/api.ts` |
| Login (OTP) + verify + role routing | ✅ | runs in Expo Go |
| Native design system + patient/doctor tab navigation | ✅ | loading, error, empty, forms, badges, cards, accessibility labels |
| Patient mobile UX redesign | ✅ | action-led home, compact headers, visit segments, richer empty states, structured profile, native DOB picker, nested settings |
| Patient pages | ✅ | home, booking, appointments/detail, reschedule/cancel, prescriptions, profile, receipt, settings |
| Doctor pages | ✅ | dashboard, appointments, encounter, SOAP, Rx, outcomes, patients/history, schedule, settings |
| `/api/v1` mobile read layer | ✅ | aggregated patient/doctor home, encounters, roster, schedule, prescriptions |
| Report upload + participant-aware report authorization | ✅ | PDF/JPEG/PNG picker; patient or appointment doctor |
| Shared pages | ✅ | call pre-join, terms, privacy, not-found |
| Mock payment flow + real-payment recovery UX | ✅ | mock confirms in Expo Go; real checkout requires native build |
| LiveKit token authorization + pre-join UX | ✅ | media rendering still requires native LiveKit modules |
| Native LiveKit media + Razorpay Checkout | 🔜 | EAS development build milestone; not available in Expo Go |

Run: `cd mobile && npx expo start` — scan QR with Expo Go. Set `EXPO_PUBLIC_API_URL`
in `mobile/.env` to the dev machine's LAN URL (phone can't reach localhost).

## v1.5 / deferred

| Feature | Status |
|---|---|
| AI scribe (transcript → draft SOAP + Rx) | 🧊 |
| Branded prescription PDF | 🧊 |
| WhatsApp reminders | 🧊 |
| Patient medical profile (slim) in encounter | 🧊 |
| Medication tracker / records vault | 🧊 undecided |
| Dashboards, diet/timeline, doctor signup | ❌ cut |

## Chat / messaging (added 2026-06-14)

Patient↔doctor messaging over a self-hosted socket.io realtime service. Note:
this reverses the original "chat cut / no websocket server" decision — see the
updated `Rules.md` #1 and `AGENTS.md`.

| Item | Status | Notes |
|---|---|---|
| Schema (conversations, messages, chat_attachments) | ✅ | attachments bound to conversation + uploader |
| Realtime infra (Postgres NOTIFY → socket.io) | ✅ | `realtime/server.ts`, `npm run realtime`; swappable behind `src/lib/realtime.ts` |
| Short-lived HMAC socket tokens (15 min, refresh on reconnect) | ✅ | `src/lib/realtime-token.ts` |
| REST API (conversations, messages, read, attachments) | ✅ | `/api/v1/conversations/*` |
| Messaging gated to **paid** appointments **or active MediFlow Care** | ✅ | `chat-policy.ts` + `patientCanMessageDoctor` in `chat.ts`; see Care section |
| Attachment authorization (uploader + conversation bound) | ✅ | `chat-policy.ts`; unit-tested |
| Web chat UI (live, pagination, attachments, read state) | ✅ | `ChatThread`, `DoctorMessages` |
| Mobile chat (Expo, live, pagination, PDF open, read state) | ✅ | `components/chat-thread.tsx` |
| Socket CORS allowlist (`REALTIME_ALLOWED_ORIGINS`) | ✅ | native apps unaffected (token auth) |
| Tests (policy predicates + token) | ✅ | 10 unit tests |
| Production realtime hosting | 🔜 | Vercel can't host the socket process — see `Deployment.md` |
| Push notifications (new-message alerts) | 🔜 | no `expo-notifications` yet; chat only updates while open |
| Realtime E2E (socket delivery) test | 🔜 | only unit coverage today |

## MediFlow Care subscription (added 2026-06-28)

Ongoing-care subscription that unlocks messaging without a prior booking, a
monthly async follow-up credit, and reminders — between paid video consults.
Brief: `docs/designs/care-subscription-plan.md`. v1 billing is a mock/admin
toggle (no Razorpay recurring yet).

| Item | Status | Notes |
|---|---|---|
| Schema (`care_subscriptions`, `care_followup_requests`) | ✅ | one row per patient↔doctor pair; `db:push`ed |
| Subscription policy (active/credit/period) | ✅ | `care-subscription-policy.ts`; 9 unit tests |
| Data + admin toggle layer | ✅ | `care-subscription.ts` (activate/deactivate/reset/prefs/follow-up/roll) |
| Messaging gate: **active subscription only** (premium feature) | ✅ | `patientCanMessageDoctor` in `chat.ts`; paid consult no longer unlocks chat (reversed earlier OR-gate per product call) |
| Doctor-configurable monthly price | ✅ | `doctor_profiles.care_plan_price_in_paise`; doctor settings (web+mobile); shown to patient pre-checkout |
| Cancellation breakdown (deduction/refund/timeline) | ✅ | pro-rated `computeCancellationBreakdown` + confirm screens web `/patient/care/cancel`, mobile `(patient)/care/cancel` |
| Subscriber badge across doctor surfaces | ✅ | patient detail, patient **list** (+ "members" filter), **messages** list/header — web + mobile |
| Patient API (status/start/cancel/prefs/follow-up) | ✅ | `/api/v1/patient/care/*` |
| Checkout/payment page before activation | ✅ | web `/patient/care/checkout`, mobile `(patient)/care/checkout`; mock pay in v1 (₹499/mo) |
| Doctor/admin toggle API (+ subscriber list) | ✅ | `/api/v1/doctor/care-subscriptions` (GET list) + `/[patientId]` (POST toggle) |
| Doctor care-management screen (count + members + toggle) | ✅ | web `/doctor/care`, mobile `(doctor)/care`; nav + doctor-home entry |
| Doctor care-follow-up action API | ✅ | `/api/v1/doctor/care-follow-ups/[id]` (fulfill→async consult / dismiss) |
| Work queue: care follow-ups + count | ✅ | web + mobile work-queue, doctor patient detail badge |
| Patient mobile (home card, messages unlock, settings, profile prefs) | ✅ | `care-card.tsx`, `care-settings.tsx` |
| Patient web (dashboard card, messages unlock, settings) | ✅ | `components/patient/CareCard.tsx` + server actions |
| Emergency disclaimer on all messaging promos | ✅ | "Messaging is not for emergencies." everywhere |
| Real Razorpay recurring billing | 🧊 | deferred; checkout page is the plug-in point; schema absorbs without migration |
| Weekly digest **email** (Resend) | 🔜 | data assembler + cron not built yet; waits on base Resend wiring |
| Doctor home subscriber count + patient-list filter | 🔜 | patient detail badge done; list filter/home stat pending |
| E2E (gate + follow-up once-per-period) | 🔜 | policy unit-tested; e2e specs pending |

## Web clinical workflow parity (added 2026-06-18)

Mobile had pulled ahead of the web UI. This pass brings the web doctor/patient
surfaces closer to the same operational model.

| Item | Status | Notes |
|---|---|---|
| Doctor work queue page | ✅ | `/doctor/work-queue`: needs Rx, unread messages, refills, follow-ups, triage flags |
| Doctor refill requests page | ✅ | `/doctor/refill-requests`: fulfil via async consult or decline |
| Doctor dashboard attention strip | ✅ | Links into the work queue from `/doctor` |
| Doctor patient record | ✅ | Clinical snapshot, timeline, reports, medicine history, refills/follow-ups, message signal |
| Doctor patient roster care filters | ✅ | Search + "needs attention" filter with per-patient badges |
| Encounter completion checklist | ✅ | SOAP/Rx/follow-up/triage checklist + follow-up recommendation controls |
| Patient home care prompts | ✅ | Follow-up prompt, pending-payment prompt, profile nudge, active medicines |
| Patient refill request CTA | ✅ | Prescription cards can create refill requests; pending state is shown |
