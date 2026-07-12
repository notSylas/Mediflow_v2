# MediFlow v2

Telemedicine app for a single doctor: a patient books a **paid** slot → joins a **video
consultation** → the doctor records a **SOAP note + structured prescription**. Between
paid visits, patients on a **MediFlow Care** subscription can **message** the doctor and
request refills.

Single doctor in v1, but the data model treats `doctor_profiles` as a real entity, so
multi-doctor later is an insert, not a rewrite. Contributor/agent guide: **[AGENTS.md](AGENTS.md)**.
Full docs index: **[docs/README.md](docs/README.md)**.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Postgres via Drizzle · Better Auth
(email OTP + optional Google) · Razorpay (payments) · LiveKit Cloud (video) · Resend
(email) · self-hosted socket.io + Postgres `LISTEN/NOTIFY` (chat) · Expo (mobile app, `mobile/`).

## Quickstart

```bash
docker start mediflow-v2-pg   # Postgres 17 on :5433 (creds in .env)
npm install
npm run db:push               # apply Drizzle schema
npm run dev                   # app on http://localhost:3000 (OTPs print to console in dev)
npm run realtime              # chat socket server on :4000 (separate terminal, optional)
```

The first account to sign in becomes a `patient`. Promote the doctor once:

```bash
npm run promote-doctor doctor@example.com
```

Mobile app: `cd mobile && npx expo start` — set `EXPO_PUBLIC_API_URL` in `mobile/.env` to
this machine's LAN URL (a phone can't reach `localhost`).

## Testing & checks

```bash
npm run lint          # eslint
npx tsc --noEmit      # typecheck
npm test              # vitest unit tests
npm run test:e2e      # playwright (⚠️ truncates the DB it points at — never aim at prod)
npm run check:env     # production env audit (add :strict to fail on missing prod values)
```

## Key invariants (see [docs/Rules.md](docs/Rules.md))

- **Slots are computed, never materialized** (rules − overrides − bookings, at query time).
- **Double-booking is prevented by the DB** (partial unique index), not app code.
- **Issued prescriptions are immutable.** Corrections happen on the next consult.
- **Money is integer paise**; times are `timestamptz`, rendered in the doctor's timezone.
- **Messaging is gated to an active Care subscription** — a one-off paid consult doesn't unlock it.
- Integrations **degrade gracefully** when unconfigured (payments→mock, video→503, OTP→console).

## Docs

Start at **[docs/README.md](docs/README.md)**. Most useful:
[Tracker.md](docs/Tracker.md) (live status) · [PRODUCT.md](docs/PRODUCT.md) (plan + scope) ·
[TechSpec.md](docs/TechSpec.md) · [AppFlow.md](docs/AppFlow.md) · [Schema.md](docs/Schema.md) ·
[Deployment.md](docs/Deployment.md) · [qa/](docs/qa/) (pre-prod test + readiness backlogs).
