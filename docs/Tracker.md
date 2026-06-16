# MediFlow v2 — Feature Tracker

Live status board. Update when state changes. Last updated: 2026-06-16.

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
| Messaging gated to **paid** appointments | ✅ | `chat-policy.ts`; unit-tested |
| Attachment authorization (uploader + conversation bound) | ✅ | `chat-policy.ts`; unit-tested |
| Web chat UI (live, pagination, attachments, read state) | ✅ | `ChatThread`, `DoctorMessages` |
| Mobile chat (Expo, live, pagination, PDF open, read state) | ✅ | `components/chat-thread.tsx` |
| Socket CORS allowlist (`REALTIME_ALLOWED_ORIGINS`) | ✅ | native apps unaffected (token auth) |
| Tests (policy predicates + token) | ✅ | 10 unit tests |
| Production realtime hosting | 🔜 | Vercel can't host the socket process — see `Deployment.md` |
| Push notifications (new-message alerts) | 🔜 | no `expo-notifications` yet; chat only updates while open |
| Realtime E2E (socket delivery) test | 🔜 | only unit coverage today |
