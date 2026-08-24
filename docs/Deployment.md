# MediFlow v2 — Deployment Guide

**Current target: Google Cloud Run + Cloud SQL** (`asia-south1` / Mumbai), with LiveKit Cloud (video), Razorpay (payments), Resend (email), and a persistent Node host for realtime chat.

Two Cloud Run services, both scaling to zero:

| Service | Image | Notes |
|---|---|---|
| `mediflow-web` | `Dockerfile.web` | Next standalone. Serves pages, `/api/auth/*`, and proxies the endpoints in `backend/api/routes.json` to the backend. |
| `mediflow-backend` | `Dockerfile.backend` | Hono API. 13 deps, no React/Next. |

Both connect to Cloud SQL over the IAM-authenticated unix socket (`--add-cloudsql-instances`), so the instance keeps **zero authorized networks** and is unreachable from the internet. A Serverless VPC connector would cost ~$8-10/month and is not needed for this.

**Cost:** Cloud SQL `db-f1-micro` is roughly **$11-14/month** — Cloud SQL has no free tier. Cloud Run at single-clinic traffic is effectively free (scales to zero). Everything else is free-tier except Razorpay's per-transaction fee and the realtime host.

## Automated deploys

`.github/workflows/deploy.yml` deploys both services on push to `main`; pull requests run the checks only. Auth is Workload Identity Federation — **no service-account key is stored in GitHub**. Nothing to configure per-repo; the pool, OIDC provider (pinned to this repository), and `github-deployer` service account already exist.

Secrets referenced by `--set-secrets` (`mediflow-cron-secret`, `mediflow-doctor-signup-code`, etc.) are one-time manual creations, e.g. `gcloud secrets create mediflow-doctor-signup-code --data-file=-`, with `github-deployer` granted `roles/secretmanager.secretAccessor` on the project (or the individual secret) so Cloud Run can resolve them at deploy time.

Two things that will bite if changed:

- **`BACKEND_ORIGIN` is a Docker build arg, not a runtime env var.** Next bakes rewrites into `routes-manifest.json` at build time. Set at runtime it silently does nothing and every `/api/*` call stays in-process.
- **`/healthz` is intercepted by Google Frontend on `*.run.app`** and never reaches the container. Use **`/health`**.

## Manual deploy (reference)

```bash
# backend
docker buildx build --platform linux/amd64 -f Dockerfile.backend \
  -t asia-south1-docker.pkg.dev/mediflow-v2-app/mediflow/backend:TAG --push .
gcloud run deploy mediflow-backend --region=asia-south1 \
  --image=asia-south1-docker.pkg.dev/mediflow-v2-app/mediflow/backend:TAG \
  --add-cloudsql-instances=mediflow-v2-app:asia-south1:mediflow-db

# web (BACKEND_ORIGIN must be a build arg)
docker buildx build --platform linux/amd64 -f Dockerfile.web \
  --build-arg BACKEND_ORIGIN=https://<backend-url> \
  -t asia-south1-docker.pkg.dev/mediflow-v2-app/mediflow/web:TAG --push .
```

## Connection pooling

`db-f1-micro` allows **25 connections total**. Both images set `POSTGRES_MAX_CONNECTIONS=3` and Cloud Run max-instances are capped (web 3, backend 4), so worst case is 21. Raise the instance tier before raising either.

## Schema

Push through the Cloud SQL Auth Proxy — never open the instance to the internet:

```bash
cloud-sql-proxy --port 5434 mediflow-v2-app:asia-south1:mediflow-db
DATABASE_URL='postgresql://mediflow_app:<pw>@127.0.0.1:5434/mediflow' npm run db:push
```

The proxy uses Application Default Credentials, which are separate from the `gcloud` CLI login: `gcloud auth application-default login`.

---

## Alternative: Vercel + Neon

The original target, kept because it still works and is cheaper (Neon has a real free tier). Vercel cannot host the realtime socket process either way — see 5c.

## 0. Prerequisites

- GitHub repo with this project pushed (Vercel deploys from it).
- Accounts: vercel.com, neon.tech, cloud.livekit.io, razorpay.com (KYC takes days — start early), resend.com.

## 1. Database — Neon

1. Create a project (region: Singapore `ap-southeast-1` is closest to India).
2. Copy the **pooled** connection string (`...-pooler...`) — serverless functions need pooling.
3. Push the schema from your machine:
   ```bash
   DATABASE_URL='<neon-pooled-url>' npm run db:push
   ```
4. Verify: `DATABASE_URL='<url>' npx drizzle-kit studio`.

## 2. Video — LiveKit Cloud

1. Create a project → copy `LIVEKIT_URL` (wss://…), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
2. Free tier covers a single doctor's clinic comfortably; no other config needed — rooms are created implicitly by token grant.

## 3. Payments — Razorpay

1. Complete KYC, then generate **live keys**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (use `rzp_test_*` keys for staging).
2. After the first deploy, add a webhook: Dashboard → Webhooks → URL `https://<your-domain>/api/webhooks/razorpay`, events `payment.captured` + `payment.failed`, and set a secret → `RAZORPAY_WEBHOOK_SECRET`.
3. No keys set = the app silently runs the mock provider. **Production must have keys** — verify the payment step opens the Razorpay popup after deploying.

## 4. App — Vercel

1. Import the GitHub repo (framework auto-detected: Next.js).
2. Environment variables (Production):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled URL |
   | `POSTGRES_MAX_CONNECTIONS` | `3`-`5` for Vercel/Neon unless load testing proves you need more |
   | `BETTER_AUTH_SECRET` | `npx @better-auth/cli secret` |
   | `BETTER_AUTH_URL` | `https://<your-domain>` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional — Google sign-in |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | from step 3 |
   | `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | from step 2 |
   | `RESEND_API_KEY` | Resend production key |
   | `EMAIL_FROM` | verified sender, e.g. `MediFlow <noreply@yourdomain.com>` |
   | `CRON_SECRET` | long random secret for `/api/cron/reminders` |
   | `DOCTOR_SIGNUP_CODE` | long random secret for `/doctor/register` — fails closed (503) if unset, unlike `CRON_SECRET` |
   | `NEXT_PUBLIC_REALTIME_URL` | public realtime host URL, e.g. `https://realtime.yourdomain.com` |
   | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional |
   | `LOG_LEVEL` | optional; use `info` in production |

   Production launch rule: do not leave Razorpay, LiveKit, Resend, `CRON_SECRET`,
   or `DOCTOR_SIGNUP_CODE` blank. Blank Razorpay keys fall back to mock payments,
   blank Resend prints emails to logs, blank `CRON_SECRET` leaves the reminder
   endpoint open, and blank `DOCTOR_SIGNUP_CODE` disables `/doctor/register`
   entirely (503) rather than leaving it open.

   Before deploying, run the env audit locally after loading/copying production
   values:

   ```bash
   npm run check:env
   npm run check:env:strict
   ```

   The script hides values and only reports present/missing/unsafe settings.
   Strict mode fails until production-only values are set.

3. Deploy. Add your custom domain (Settings → Domains) and update `BETTER_AUTH_URL` to match.
4. If using Google sign-in: add `https://<domain>/api/auth/callback/google` to the OAuth client's redirect URIs.

## 5. Seed the doctor

The first account to sign in becomes a patient by default. Normal path: sign
in, then visit `/doctor/register` and enter the `DOCTOR_SIGNUP_CODE` value —
this flips `role` to `'doctor'` and auto-provisions the `doctor_profiles` row
in one step.

Fallback, if the code isn't handy or a direct promotion is needed (e.g. an
emergency, or promoting someone without going through the app): the script
(after they've signed in once)

```bash
DATABASE_URL='<url>' npm run promote-doctor doctor@example.com
```

or directly in the Neon SQL editor:

```sql
UPDATE "user" SET role = 'doctor' WHERE email = '<doctor-email>';
```

Then the doctor visits `/doctor` (profile auto-provisions), sets fee/slot length/timezone and availability. Done — patients can book.

## 5b. Email + reminders cron

`vercel.json` already declares a cron that calls `/api/cron/reminders` every 10 minutes.
Set `CRON_SECRET` in Vercel; the cron job sends `Authorization: Bearer <CRON_SECRET>`,
which the endpoint verifies. No other setup needed — booking confirmations and
pre-consult reminder emails go out automatically when `RESEND_API_KEY` and
`EMAIL_FROM` are configured. Without `RESEND_API_KEY`, emails are logged to the
server console for development only.

## 5c. Realtime chat server

Patient↔doctor chat is delivered by a **separate long-running process**
(`realtime/server.ts`, started with `npm run realtime`) — Vercel's serverless
functions can't hold a websocket open, so this **cannot** run on Vercel. Host it
on a platform that runs a persistent Node process: Railway, Fly.io, Render, or a
small VM.

What it needs:

- `DATABASE_URL` — same Postgres as the app (it uses `LISTEN/NOTIFY`, no tables).
- `REALTIME_SECRET` (or it reuses `BETTER_AUTH_SECRET`) — **must match the app's**
  value so socket tokens verify.
- `REALTIME_PORT` — the port to listen on (default 4000); map it to a public
  HTTPS endpoint (wss://) via your host's TLS termination.
- `REALTIME_ALLOWED_ORIGINS` — comma-separated browser origins (your app's
  domain). Native mobile apps send no Origin and are exempt.

Then on the **app** (Vercel) set `NEXT_PUBLIC_REALTIME_URL` to the public socket
URL (e.g. `https://realtime.yourdomain.com`). If the socket server is down, chat
still works over REST — messages just don't appear until the thread is refetched.

> Chat data note: attachments are stored inline as Postgres `bytea` (fine for
> small images/PDFs). Move them to object storage (S3/R2) before real scale.

## 6. Post-deploy checklist

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run check:env:strict`, and `npm run build` pass before deploy.
- [ ] Vercel env has no local URLs: `BETTER_AUTH_URL` is the production domain and `DATABASE_URL` is Neon, not Docker.
- [ ] Book a real ₹-test consultation end-to-end (Razorpay test keys on a staging deploy, or a small live payment refunded after).
- [ ] Webhook delivery shows 200 in the Razorpay dashboard.
- [ ] Video call works doctor↔patient across two devices/networks.
- [ ] OTP, booking confirmation, and reminder email delivery works through Resend.
- [ ] `e2e` suite green locally against the production build: `npx playwright test`.
- [ ] Realtime server reachable: `GET https://<realtime-host>/` returns `realtime ok`, and a message sent on one device appears live on another.
- [ ] `/api/cron/reminders` returns 401 without the secret and 200 with `Authorization: Bearer <CRON_SECRET>`.

## Local dev (reference)

```bash
docker start mediflow-v2-pg   # Postgres 17 on :5433
npm run dev                    # app on :3000, OTPs in console
npm run realtime               # chat socket server on :4000 (separate terminal)
npx vitest run                 # unit tests
npx playwright test            # e2e (truncates the local DB!)
```

## Notes & gotchas

- The e2e global setup **truncates the database it points at** — never point `.env`'s `DATABASE_URL` at Neon when running Playwright.
- Vercel functions are stateless: anything in-memory (none today) won't survive between requests. The DB is the only state.
- Razorpay webhook is the authoritative payment confirmation; the client callback is best-effort. If a patient pays and closes the tab, the webhook still confirms.
- `medical_reports` stores files in Postgres (bytea). Watch Neon storage if report volume grows; the swap to object storage is isolated in `backend/consult/reports.ts` + the upload/download routes.
