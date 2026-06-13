# MediFlow v2 — Implementation Plan

Reference docs: `PRD.md` (what & why) · `TechSpec.md` (how) · `Tracker.md` (live status).

## Milestone 1 — Foundation ✅
Next.js 16 + TS scaffold, Drizzle + Postgres (Docker :5433), Better Auth (email OTP, console-logged in dev; optional Google), role field, base schema, pino logging, optional Sentry, Vitest + Playwright harnesses.

## Milestone 2 — Doctor availability ✅
Doctor profile (fee, slot length, timezone), weekly `availability_rules` editor, date `availability_overrides` editor, slot engine computing free slots at query time (unit-tested, timezone-aware).

## Milestone 3 — Booking & payment ✅ (Razorpay wiring in progress)
4-step booking flow (intake with visit reason + symptoms + report upload → slot pick → payment → confirmation). `pending_payment` hold (10 min) created at slot pick; DB unique index kills double-booking; cancel with 2-hour window; patient appointment list. Mock payment provider is the stable contract; real Razorpay (order → Checkout → signature verify → webhook) is the open thread.

## Milestone 4 — Consultation ✅
LiveKit video (token endpoint gated by participant + time window, pre-join device check, `/call/[id]`), doctor appointments list (Today/Upcoming/Past), encounter page (SOAP editor, structured prescription draft→issue→lock, outcome buttons), returning-patient history (past consults + prescriptions + medicine history), patient appointment detail (join button, outcome, prescription), patient prescriptions page, role-based header nav.

## Milestone 5 — Launch readiness 🔜
1. **Finish Razorpay** (task 6): order at hold, Checkout in PaymentStep, `/api/webhooks/razorpay` with signature verification, payment status reconciliation.
2. **E2E expansion** (task 7): consult + prescription + returning-patient specs; full suite green.
3. **Emails via Resend**: OTP delivery, booking confirmation, reminder (cron or scheduled function).
4. **Docs & deploy** (task 8): folder structure doc, deployment guide (Vercel + Neon + LiveKit Cloud + Razorpay live keys + Resend), production env checklist.
5. Seed script for the real doctor's profile.

## Milestone 6 / v1.5 — Differentiators
AI scribe (consult transcript → draft SOAP + prescription for doctor approval), branded prescription PDF, WhatsApp reminders, patient medical-profile slim form (DOB, allergies, conditions) surfaced in encounter.

## Working rules for each task

Build lib (pure logic, unit-test it) → API route (Zod + authz) → server page → client component. Type-check and run unit tests before moving on; e2e at milestone boundaries. Update `Tracker.md` as states change.
