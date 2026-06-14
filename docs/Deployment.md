# MediFlow v2 — Deployment Guide

Target setup: **Vercel** (app) + **Neon** (Postgres) + **LiveKit Cloud** (video) + **Razorpay** (payments) + **Resend** (email, once wired). Total cost at single-doctor scale: roughly free-tier everything except Razorpay's per-transaction fee.

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
   | `BETTER_AUTH_SECRET` | `npx @better-auth/cli secret` |
   | `BETTER_AUTH_URL` | `https://<your-domain>` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional — Google sign-in |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | from step 3 |
   | `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | from step 2 |
   | `RESEND_API_KEY` | once email is wired |
   | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional |

3. Deploy. Add your custom domain (Settings → Domains) and update `BETTER_AUTH_URL` to match.
4. If using Google sign-in: add `https://<domain>/api/auth/callback/google` to the OAuth client's redirect URIs.

## 5. Seed the doctor

The first account to sign in becomes a patient by default. Promote the doctor once,
either with the script (after they've signed in once):

```bash
DATABASE_URL='<url>' npm run promote-doctor doctor@example.com
```

or directly in the Neon SQL editor:

```sql
UPDATE "user" SET role = 'doctor' WHERE email = '<doctor-email>';
```

Then the doctor visits `/doctor` (profile auto-provisions), sets fee/slot length/timezone and availability. Done — patients can book.

## 5b. Reminders cron

`vercel.json` already declares a cron that calls `/api/cron/reminders` every 10 minutes.
Set `CRON_SECRET` in Vercel; the cron job sends `Authorization: Bearer <CRON_SECRET>`,
which the endpoint verifies. No other setup needed — pre-consult reminder emails go out
automatically once email (Resend) is configured.

## 6. Post-deploy checklist

- [ ] Book a real ₹-test consultation end-to-end (Razorpay test keys on a staging deploy, or a small live payment refunded after).
- [ ] Webhook delivery shows 200 in the Razorpay dashboard.
- [ ] Video call works doctor↔patient across two devices/networks.
- [ ] OTP email delivery (or interim: confirm pino logs in Vercel → Logs).
- [ ] `e2e` suite green locally against the production build: `npx playwright test`.

## Local dev (reference)

```bash
docker start mediflow-v2-pg   # Postgres 17 on :5433
npm run dev                    # app on :3000, OTPs in console
npx vitest run                 # unit tests
npx playwright test            # e2e (truncates the local DB!)
```

## Notes & gotchas

- The e2e global setup **truncates the database it points at** — never point `.env`'s `DATABASE_URL` at Neon when running Playwright.
- Vercel functions are stateless: anything in-memory (none today) won't survive between requests. The DB is the only state.
- Razorpay webhook is the authoritative payment confirmation; the client callback is best-effort. If a patient pays and closes the tab, the webhook still confirms.
- `medical_reports` stores files in Postgres (bytea). Watch Neon storage if report volume grows; the swap to object storage is isolated in `src/lib/reports.ts` + the upload/download routes.
