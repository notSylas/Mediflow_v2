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
- Patient↔doctor chat IS in scope (added post-v1). Realtime runs on a **separate self-hosted socket.io process** (`realtime/server.ts`, `npm run realtime`) fed by Postgres `LISTEN/NOTIFY`. Messages persist via REST first; the socket is best-effort delivery only. Transport is swappable behind `backend/messaging/realtime.ts`. Messaging is a **premium MediFlow Care subscription** feature — gated to patients with an **active subscription** (a one-off paid consult no longer unlocks it; gate lives in `patientCanMessageDoctor`, `backend/messaging/chat.ts`). Attachments are bound to their conversation + uploader.
- A minimal authenticated shell is in v1 scope: email-OTP login (`(auth)/login`), session-aware header with logout, and simple role-based landing pages (`/patient`, `/doctor`) — these are placeholders, not dashboards.
- Out of v1 scope: complex dashboards, doctor discovery. AI scribe (transcript → draft SOAP note) is v1.5. Doctor self-registration (`/doctor/register`, gated by `DOCTOR_SIGNUP_CODE`) shipped 2026-08-25 — still single-doctor: it's a nicer way to create/replace THE canonical doctor, not a multi-doctor marketplace.
- Medical records vault (**Vault Share**) was descoped from v1 and then built anyway (2026-08-11) — patient-held records plus a short-lived, revocable share code a receiving doctor can redeem without an account. Domain logic in `backend/vault/`, endpoints under `/api/v1/patient/vault/*` and `/api/v1/vault/redeem`. The redeem route is one of exactly two no-session exceptions in `docs/Rules.md` #11.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4. Postgres via Drizzle (`backend/db/schema.ts`). Auth: Better Auth (`backend/auth/auth.ts`) — email OTP (logs to console in dev) + optional Google; users have a `role` field (`patient` | `doctor`).

### Code layout

Four sibling top-level apps — there is no `src/`:

```
web/        Next.js app (the website)
backend/    all server-only logic + the standalone API
realtime/   socket.io process
mobile/     Expo app
```

- `backend/` — **all** server-only logic, and **no web framework**: nothing under it may import `next/*`. Domain modules are vertical slices (`booking/`, `care/`, `consult/`, `messaging/`, `payments/`, `people/`, `video/`, `notifications/`), with `db/`, `auth/`, and `core/` (cross-cutting infra) underneath. Vitest specs sit next to what they test.
- `backend/api/` — the HTTP layer. Every endpoint is written **once** here as an `ApiHandler`: a plain `(Request, { params }) => Response`. See `backend/api/http.ts`.
- `backend/server/` — the standalone Hono process (`npm run backend`, :4100) that mounts those handlers. Deployed separately to Cloud Run.
- `web/app` — Next.js routing only, and thin. Page routes, plus `api/*` route files that are one-line `nextRoute(handler)` re-exports of `backend/api/`. **Never put endpoint logic in a `route.ts`** — it belongs in `backend/api/` so both transports share it and can't drift.
- `web/components` — all UI. `web/lib` — client-side helpers (`cn`, tone tokens, the Better Auth browser client).

The Next project root is `web/`, so the scripts pass it explicitly (`next dev web`). Two consequences worth knowing: `web/next.config.ts` has to load the repo-root `.env` itself (Next would only look in `web/`), and `web/tsconfig.json` extends the root one.

Import aliases: `~backend/*` → `backend/*`, `@/*` → `web/*`. The prefixes differ on purpose — these are separate apps, not folders in one tree.

### How the website talks to the backend

Two paths, both live:

1. **In-process import** — server components and `web/app/api/**` import `~backend/*` directly. No HTTP hop. This is how most of the app works today.
2. **HTTP proxy** — set `BACKEND_ORIGIN` and the web app rewrites the endpoints in `backend/api/routes.json` to the standalone backend. The rewrite is same-origin (`beforeFiles` in `web/next.config.ts`), so session cookies keep working and no CORS setup is needed; client code keeps calling relative `/api/...` URLs. Unset = everything in-process, which is the default.

   **Next bakes rewrites into the build**, so `BACKEND_ORIGIN` must be set at *build* time in production (`BACKEND_ORIGIN=... npm run build`), not just at runtime. `next dev` re-reads the config, so runtime is enough there.

`backend/api/routes.json` is the single source of truth for what the backend serves. `manifest.ts` pairs each entry with a handler and **throws at startup** if either side is missing, so the proxy list and the mounted routes can't drift.

**Migration status: complete.** All 75 endpoints live in `backend/api/` and are served by both transports. Every `web/app/api/**/route.ts` is a one-line `nextRoute(...)` re-export — the sole exception is `/api/auth/[...all]`, the Better Auth mount, which stays web-app-local on purpose (the web app issues its own session cookies).

Adding an endpoint means: write the handler in `backend/api/`, register it in `manifest.ts`, add it to `routes.json`, and add the thin `route.ts`. Miss either of the middle two and the backend refuses to start.

## Dev

- DB: Docker container `mediflow-postgres-1` (created by `docker compose`), Postgres 17 on **port 5433** (5432 belongs to the old repo). Start: `docker start mediflow-postgres-1`. Creds in `.env`.
- `npm run dev` — website on :3000 (`next dev web`)
- `npm run backend` — standalone API on :4100 (`/health` to check; `/healthz` also works locally but is intercepted by Google Frontend on Cloud Run)
- `npm run realtime` — socket.io process
- `npm run db:push` / `db:generate` / `db:studio` — Drizzle
- Money is stored in paise (integer), times as timestamptz; doctor timezone default `Asia/Kolkata`.

## Status

Docs live in `docs/` — start at [`docs/README.md`](docs/README.md) for the full index. Authoritative: `PRODUCT.md` (master product plan + scope), `Tracker.md` (**live status board — keep updated**), `TechSpec.md`, `AppFlow.md`, `Schema.md`, `Design.md`, `Rules.md`, `Deployment.md`. Historical planning docs and old-repo references are under `docs/archive/`; the pre-prod test/readiness backlog is under `docs/qa/`. Check `Tracker.md` first when resuming work.

The core v1 clinic loop, Razorpay, messaging/Care, refills/follow-ups, Vault Share, and the Expo mobile app are built; the e2e suite is green at 19/19.

**Both services are deployed to Cloud Run** (`asia-south1`) against Cloud SQL Postgres 17 — see `docs/Deployment.md`. Pushes to `main` build and deploy automatically via `.github/workflows/deploy.yml`. That deploy is **testing-only**: Razorpay and Resend keys are unset, so payments run the mock provider and OTP codes go to Cloud Run logs instead of email.

Remaining for launch: real Razorpay/Resend credentials, the Vault Share KMS env vars, doctor seed, and the pre-prod verification tracked in Jira (`docs/qa/`). See `Tracker.md` for live status.
