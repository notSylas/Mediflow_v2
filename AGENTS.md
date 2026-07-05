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

Docs suite in `docs/`: `PRD.md` (product + scope fences) · `TechSpec.md` (stack + key designs) · `AppFlow.md` (user flows + state machine) · `Design.md` (UI patterns) · `Schema.md` (DB reference) · `ImplementationPlan.md` (milestones) · `Tracker.md` (**live status board — keep updated**) · `Rules.md` (engineering rules) · `v1-feature-inventory.md` + `v1-ui-flows.md` (old-repo reference). Check `Tracker.md` first when resuming work.

Milestones 1–4 done + Razorpay + full e2e suite (5 specs green: auth, booking, consult/prescription/returning-patient). Remaining for launch: Resend emails (OTP, confirmation, reminder), production deploy per `docs/Deployment.md`, doctor seed. Then v1.5 (AI scribe, Rx PDF).
