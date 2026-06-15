# MediFlow v2 — Engineering Rules

Non-negotiables for anyone (human or AI) working in this repo. `AGENTS.md` is the short version; this is the full one.

## Architecture (settled — don't re-litigate)

1. The Next.js app is the system of record and handles all reads/writes. The **one** permitted auxiliary process is the self-hosted socket.io realtime server (`realtime/server.ts`) for chat delivery — it owns no data, only fans out Postgres `NOTIFY` events to connected clients. No other separate backend, no Celery/Redis equivalents. Chat messages are always persisted via REST first; realtime is best-effort and the app stays fully functional if the socket server is down.
2. Slots are **computed, never materialized**.
3. Double-booking prevention lives in the **database** (partial unique index), not application logic. Any new booking path must cancel expired holds for the slot, then insert, and map error 23505 → 409.
4. Issued prescriptions are **immutable**. No edit/delete path, ever — corrections happen on the next consult.
5. Video is managed (LiveKit). The app mints tokens; media never touches our server.
6. Integrations degrade gracefully when unconfigured: payments → mock, video → 503 + friendly page, OTP → log. Never crash on missing env at import time.
7. Old repo (`~/Projects/MediFlow`) is reference-only. Never copy code from it; never modify it.

## Data

8. Money: integer paise. Floats never touch currency.
9. Timestamps: `timestamptz`; wall-clock values are doctor-timezone-local; render with `formatInTimeZone`.
10. Schema changes go in `src/db/schema.ts` → `npm run db:push` (dev). Keep `docs/Schema.md` in sync.
11. Patient data is medical data: no PII in logs (log ids, not names/emails/notes), ownership check on **every** resource access.

## API

12. Every route: auth via `requireSession`/`requireDoctorSession` → Zod-validate input → ownership check → act. No exceptions.
13. Error contract: `{ error: string | issues }` with correct status (400/401/403/404/409/410/503). User-actionable messages.
14. State transitions are validated server-side (e.g. only `confirmed` → `completed`/`no_show`).

## Frontend

15. shadcn/ui components from `src/components/ui/` — add via CLI, don't hand-roll.
16. Server components for data; small focused client components for interactivity. Client components never import server-only modules (`livekit-server-sdk`, `db` …) — split pure logic into its own file (see `call-window.ts`).
17. Status enums get human labels (`STATUS_LABELS`), never rendered raw.
18. Irreversible actions get a confirmation dialog stating the consequence.

## Quality

19. Pure logic (slot math, windows, rules) lives in `src/lib/` and gets Vitest coverage **when written**, not later.
20. `npx tsc --noEmit` clean before any task is called done. Playwright suite green at milestone boundaries.
21. E2E runs against a production build with a real DB; never mock the DB in e2e.

## Security & secrets

22. No secrets in git — `.env*` is ignored (only `.env.example` is committed, with empty values). The v1 repo leaked a GCP key + Django secrets; that mistake is not repeated here.
23. Webhooks verify signatures before touching data (Razorpay HMAC).
24. Auth rate limiting stays on in production (`DISABLE_RATE_LIMIT` is for the test harness only).

## Process

25. Update `docs/Tracker.md` when feature states change; keep `AGENTS.md` Status line current.
26. Conventional-ish commits, present tense, scoped ("booking: …", "consult: …").
27. When scope questions come up, check `PRD.md` fences and `docs/v1-feature-inventory.md` dispositions before adding anything.
