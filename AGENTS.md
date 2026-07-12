<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MediFlow v2

Telemedicine app for a single doctor: patient books a paid slot → video consultation → doctor records notes/prescription. Fresh rebuild of `~/Projects/MediFlow` (old Django+React repo — reference only, never modify it, never copy code from it).

## Architecture decisions (settled — don't re-litigate)

- Single doctor in v1, but `doctor_profiles` is a real entity: multi-doctor later is an insert, not a migration.
- Pay at booking via Razorpay (committed patients are the whole point — the doctor's pain is no-shows).
- Slots are computed at query time from `availability_rules` minus `availability_overrides` minus booked appointments. Never materialize slots.
- Double-booking is prevented by the partial unique index `uq_appointments_doctor_slot` in the DB, not by application code. Booking flow must cancel expired `pending_payment` holds for a slot before inserting.
- Video via LiveKit Cloud (app only mints tokens; media never touches our server). Email via Resend. No self-hosted WebRTC, no Celery/Redis equivalents.
- Patient↔doctor chat IS in scope (added post-v1). Realtime runs on a **separate self-hosted socket.io process** (`realtime/server.ts`, `npm run realtime`) fed by Postgres `LISTEN/NOTIFY`. Messages persist via REST first; the socket is best-effort delivery only. Transport is swappable behind `src/lib/realtime.ts`. Messaging is a **premium MediFlow Care subscription** feature — gated to patients with an **active subscription** (a one-off paid consult no longer unlocks it; gate lives in `patientCanMessageDoctor`, `src/lib/chat.ts`). Attachments are bound to their conversation + uploader.
- A minimal authenticated shell is in v1 scope: email-OTP login (`(auth)/login`), session-aware header with logout, and simple role-based landing pages (`/patient`, `/doctor`) — these are placeholders, not dashboards.
- Out of v1 scope: medical records vault, complex dashboards, doctor signup/onboarding (creating `doctor_profiles` rows), doctor discovery. AI scribe (transcript → draft SOAP note) is v1.5.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4. Postgres via Drizzle (`src/db/schema.ts`). Auth: Better Auth (`src/lib/auth.ts`) — email OTP (logs to console in dev) + optional Google; users have a `role` field (`patient` | `doctor`).

## Dev

- DB: Docker container `mediflow-v2-pg`, Postgres 17 on **port 5433** (5432 belongs to the old repo). Start: `docker start mediflow-v2-pg`. Creds in `.env`.
- `npm run dev` — app on :3000
- `npm run db:push` / `db:generate` / `db:studio` — Drizzle
- Money is stored in paise (integer), times as timestamptz; doctor timezone default `Asia/Kolkata`.

## Status

Docs live in `docs/` — start at [`docs/README.md`](docs/README.md) for the full index. Authoritative: `PRODUCT.md` (master product plan + scope), `Tracker.md` (**live status board — keep updated**), `TechSpec.md`, `AppFlow.md`, `Schema.md`, `Design.md`, `Rules.md`, `Deployment.md`. Historical planning docs and old-repo references are under `docs/archive/`; the pre-prod test/readiness backlog is under `docs/qa/`. Check `Tracker.md` first when resuming work.

The core v1 clinic loop, Razorpay, messaging/Care, refills/follow-ups, and the Expo mobile app are built; the e2e suite (auth, booking, consult + API authorization/IDOR/concurrency/validation/care/refills) is green. Remaining for launch: production deploy per `docs/Deployment.md`, doctor seed, and the pre-prod verification tracked in Jira (`docs/qa/`). See `Tracker.md` for live status.
