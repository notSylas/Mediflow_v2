# MediFlow v2 — Technical Specification

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | One deployable for UI + API |
| Database | PostgreSQL 17 via Drizzle ORM | Relational integrity does the heavy lifting (see uniqueness) |
| Auth | Better Auth — email OTP + optional Google | No passwords; `role` field on user (`patient` \| `doctor`) |
| Payments | Razorpay (mock provider in dev/test) | India-first; pay-at-booking |
| Video | LiveKit Cloud | App only mints tokens; media never touches our server |
| Email | Resend (planned) | Confirmations + reminders |
| Styling | Tailwind 4 + shadcn/ui | |
| Validation | Zod on every API input | |
| Logging | pino (`src/lib/logger.ts`) | |
| Monitoring | Sentry (optional, env-gated) | |
| Unit tests | Vitest + Testing Library | Pure logic: slots, booking rules, call window |
| E2E tests | Playwright against a production build | Real DB, real auth (rate limit disabled via `DISABLE_RATE_LIMIT`) |

## Key designs

### Slot engine (`src/lib/slots.ts`, `src/lib/availability.ts`)
Free slots are **computed at query time**: weekly `availability_rules` minus `availability_overrides` minus non-cancelled appointments. Slots are never materialized — no sync bugs, no ghost slots. All doctor-local times use the profile timezone (`date-fns-tz`).

### Booking & hold (`/api/appointments` POST)
Picking a slot immediately inserts an appointment with `status=pending_payment` and a 10-minute `holdExpiresAt`. The slot query treats expired holds as free; the insert path first cancels expired holds for that exact slot, then inserts. **Double-booking is impossible at the DB level**: partial unique index `uq_appointments_doctor_slot (doctor_id, starts_at) WHERE status <> 'cancelled'`. A losing concurrent insert gets Postgres error 23505 → HTTP 409.

### Payments (`/api/appointments/[id]/payment`)
Provider abstraction: `mock` (dev/e2e — confirms directly) and `razorpay` (order at hold → Checkout → signature-verified callback + webhook → confirm). Razorpay wiring is in progress; the mock path is the stable contract.

### Video (`src/lib/video.ts`, `src/lib/call-window.ts`, `/api/appointments/[id]/video-token`)
Room per appointment (`appt_<id>`). Token issued only to the two participants, only while `status=confirmed`, and only within the window [start − 10 min, end + 30 min] (`getJoinDenial`, pure + unit-tested). `/call/[id]` renders LiveKit `PreJoin` (camera/mic check) then `VideoConference`. Server returns 503 gracefully when LiveKit env is unset.

### Consultation (`src/lib/consult.ts`)
- SOAP note upsert per appointment (doctor-only).
- Prescription: one per appointment, `draft → issued`; issued = permanently locked (HTTP 409 on edit). Structured medicines (name, strength, timing flags, food relation, duration, instructions).
- Returning-patient history: past completed appointments + notes + issued prescriptions, plus a flat medicine history, queried per encounter.

### AuthZ pattern (`src/lib/api-auth.ts`)
`requireSession()` / `requireDoctorSession()` return the user or a short-circuit `NextResponse`. Resource access goes through `getAppointmentForPatient` (patient-owned) or `getAppointmentForParticipant` (either party) — ownership is checked on every route.

## Environment variables

See `.env.example`. Groups: `DATABASE_URL`; `BETTER_AUTH_*` (+ optional `GOOGLE_*`); `RAZORPAY_*`; `LIVEKIT_*`; `RESEND_API_KEY`; optional `SENTRY_DSN`, `LOG_LEVEL`. Every integration degrades gracefully when its env group is unset (mock payments, 503 video, console OTP).

## Error handling

API routes return `{ error }` JSON with correct status codes (400 validation, 401/403 auth, 404 ownership, 409 conflict/locked, 410 expired hold, 503 unconfigured). Client components surface these verbatim where user-actionable.
