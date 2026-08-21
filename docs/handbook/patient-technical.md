# MediFlow — Patient Journey (Level 2: Technical)

Authored 2026-08-12. Exact APIs, database tables, and security mechanisms
behind every patient-facing feature in [patient-journey.md](patient-journey.md).
File paths are repo-relative from the project root. Companion:
[doctor-technical.md](doctor-technical.md).

## Stack recap

Next.js 16 (App Router) + TypeScript, Postgres via Drizzle (`backend/db/schema.ts`),
Better Auth for auth, Razorpay for payments, LiveKit for video, a self-hosted
socket.io process for realtime chat delivery, AWS KMS (with a dev-only
software fallback) for Vault Share encryption. Mobile is Expo/React Native,
calling the same backend.

## 1. Auth — email OTP, sessions, mobile session handling

**Mechanism** (`backend/auth/auth.ts`, `better-auth` + `emailOTP` plugin):
- Session: signed, httpOnly cookie; default 7-day expiry, 1-day rolling
  refresh. Every request re-validates against the `session` table via
  `auth.api.getSession({ headers })` — not stateless JWT, a real DB check
  each time.
- OTP: 6-digit numeric, 5-minute expiry, max 3 attempts (Better Auth
  library defaults). **Stored in plaintext** in the `verification` table —
  the library supports hashed/encrypted storage modes but this app doesn't
  opt into them. Worth knowing, not currently mitigated.
- `user.role` (`"patient" | "doctor"`) has `input: false` — cannot be set
  via any client payload, only ever set server-side (e.g. the
  `promote-doctor` script). This is what makes `requireDoctorSession()`
  trustworthy.
- Route guard: `requireSession()` / `requireDoctorSession()`
  (`backend/auth/api-auth.ts`) — every protected route calls one of these
  first and short-circuits with `NextResponse` on failure (401/403).
- **Mobile**: session cookie is held in `expo-secure-store` (iOS
  Keychain / Android Keystore), not a cookie jar. `apiFetch`/`apiUpload`
  (`mobile/backend/api/`) manually read it via `authClient.getCookie()`
  and attach it as an explicit `Cookie:` header on every request
  (`credentials: "omit"` — RN has no automatic cookie handling).
- Change-email is two-step (OTP to the *new* address proves control;
  the *old* address gets a best-effort warning email) and deliberately
  doesn't reveal whether an email is already registered (anti-enumeration).
  Password change sets `revokeOtherSessions: true` — a real session-fixation
  mitigation.
- **Rate limiting**: Better Auth's built-in limiter, `enabled: NODE_ENV
  === "production"` (off in dev/test), covers every `auth.api.*` endpoint
  mounted at `/api/auth/[...all]`. No custom rate limiting exists anywhere
  else in the app.

## 2. Home / Dashboard

`GET /api/v1/patient/home` — aggregates upcoming appointment, Care status,
follow-up prompts, active medicines in one payload for the mobile home
screen. Web's home page (`web/app/(app)/patient/page.tsx`) is a server
component that queries the same underlying `backend/*` functions directly
(no API round-trip needed — same process).

## 3. Booking

| Step | Route | DB |
|---|---|---|
| Free slots | `GET /api/slots` | Computed live from `availability_rules` − `availability_overrides` − non-cancelled `appointments`. Never materialized. |
| Report upload at intake | `POST /api/reports` | Inserts `medical_reports` (bytea, inline — no object storage yet) |
| Create booking (hold) | `POST /api/appointments` | Inserts `appointments` with `status="pending_payment"`, `holdExpiresAt = now+10min`. Cancels any expired hold on that exact slot first, then inserts — the DB's partial unique index `uq_appointments_doctor_slot (doctor_id, starts_at) WHERE status <> 'cancelled'` is what actually makes double-booking impossible; a losing concurrent insert gets Postgres `23505` → mapped to HTTP `409`. |
| Pay | `POST /api/appointments/[id]/payment` | Mock provider (no `RAZORPAY_KEY_ID`/`SECRET` set) confirms directly. Real provider creates a Razorpay order server-side, returns only the public `keyId` to the client — the secret never leaves the server. Reuses an existing order on retry. |
| Client-side payment verify | `POST /api/appointments/[id]/payment/verify` | Zod-validated body; cross-checks the submitted `orderId` against the appointment's own `payments.orderId` (blocks replaying a signature from a *different* order); verifies HMAC-SHA256 of `orderId|paymentId` keyed by `RAZORPAY_KEY_SECRET`, `timingSafeEqual` comparison. |
| Webhook (authoritative) | `POST /api/webhooks/razorpay` | Verifies HMAC-SHA256 of the **raw body** keyed by a **separate** `RAZORPAY_WEBHOOK_SECRET`, before any JSON parsing. On `payment.captured`, calls the same `confirmAppointmentPayment` the client-verify path uses — a `db.transaction` with `SELECT ... FOR UPDATE` row lock, idempotent, and explicitly refuses to un-cancel an already-cancelled booking. This path — not the client callback — is authoritative, since the client callback can be lost if the tab closes. |

**Reschedule**: `POST /api/appointments/[id]/reschedule`. **Cancel**:
`POST /api/appointments/[id]/cancel` (only within the ≥2h window, enforced
server-side, not just hidden client-side).

Mobile reads a consolidated view via `GET /api/v1/patient/appointments/[id]`
(a `v1` aggregate route) rather than the web's direct server-component DB
calls — same underlying tables, different transport.

## 4. Video

`POST /api/appointments/[id]/video-token`:
1. `requireSession()`.
2. `getAppointmentForParticipant(id, user)` — DB join confirming the
   caller is either the booked patient or (if `role==="doctor"`) the
   assigned doctor. Not found → `404`, not `403` — doesn't even confirm the
   appointment exists to an unrelated caller.
3. `isVideoConfigured()` check → `503` if LiveKit env unset.
4. `getJoinDenial(appointment, now)` (`backend/video/call-window.ts`) — pure
   function, window is `[start − 10min, end + 30min]`, `403` outside it.
   Same function backs the client's disabled-button state, but only the
   server call is a real boundary.
5. Issues a LiveKit `AccessToken` (`backend/video/video.ts`): `identity =
   access.id` (the real user id, not client-suppliable), grant scoped to
   exactly one room (`roomJoin/canPublish/canSubscribe`, no admin grant),
   **1-hour TTL**. Room name is deterministic per appointment
   (`appt_<id>`), persisted to `appointments.videoRoom`.

A leaked token is therefore bounded three ways: one room, one identity, one
hour.

## 5. Prescriptions & Refills

`GET /api/v1/patient/prescriptions` — joins `prescriptions` (status=`issued`
only) + `prescription_medicines`, denormalized `patientId`/`doctorId` on
`prescriptions` for fast history queries.

`POST /api/v1/patient/refill-requests` — inserts `refill_requests`
(`status="pending"`), tied to the specific `prescriptionId`; the doctor
fulfills or declines from their work queue (see doctor-technical.md).

Prescriptions are **immutable once issued** — no PATCH/DELETE path exists
at any layer; a correction is a new prescription on the next consult, not
an edit.

## 6. Health Vault

Full detail already lives in [`../designs/vault-share-trd.md`](../designs/vault-share-trd.md)
— summarized here for completeness:

- **Tables**: `vault_share_grants` (state machine
  `pending_otp_confirmation → active → expired/revoked`), `vault_share_access_log`
  (append-only view audit), `vault_records` (Tier 2 — patient-added
  outside records, `patientConfirmed` gates visibility).
- **Timeline read**: `GET /api/v1/patient/vault` — read-time aggregation of
  issued prescriptions + non-empty consult notes + confirmed `vault_records`,
  never materialized.
- **Share (Flow A)**: `POST .../vault/share` → self-OTP (own lightweight
  mechanism, reuses the Resend email layer, **not** Better Auth's login-OTP
  internals) → `POST .../vault/share/confirm` → server assembles the scoped
  bundle, calls AWS KMS `GenerateDataKey` (envelope encryption — one call
  returns both a usable plaintext key and its KMS-wrapped form), AES-256-GCM
  encrypts the bundle, mints an 8-character Crockford-Base32 share code
  (hash-only storage, no attempt counter needed — the code space is ~1.1
  trillion, brute-forcing an exact-hash lookup online is infeasible without
  one).
- **Redeem**: `POST /api/v1/vault/redeem`, `GET /vault/view` page — the
  **only** other public, no-session surface in the app besides `/`, `/login`,
  `/terms`, `/privacy` (`src/proxy.ts`'s `PUBLIC_PATHS` allowlist; every
  other page redirects an unauthenticated request to `/login` before it
  reaches the page component).
- **Encryption posture**: server-side access with strong controls, not
  end-to-end — the server can decrypt to render views because that's what
  lets it exist as a product feature (server-rendered view, eventually OCR)
  at all. Deletion is crypto-shredding: dropping the wrapped key renders
  ciphertext permanently unreadable, including in backups, without needing
  to scrub them.
- **Tier 2 upload**: `POST .../vault/records` (multipart, reuses
  `ALLOWED_REPORT_TYPES`/`MAX_REPORT_SIZE_BYTES` from the existing report-
  upload validation) → extraction is a deliberate stub
  (`backend/vault/vault-extraction.ts`, always returns low-confidence/empty)
  → `PATCH .../vault/records/[id]` for the patient's manual
  confirm/correct, which is what actually sets `patientConfirmed=true` and
  makes the record real.

## 7. MediFlow Care & Messages

- `GET/POST /api/v1/patient/care`, `POST /api/v1/patient/care/follow-up`,
  `GET /api/v1/patient/care/cancellation` (pro-rated breakdown) —
  `care_subscriptions` table, one row per patient↔doctor pair.
- Messaging gate is a single predicate, `patientCanMessageDoctor`
  (`backend/messaging/chat.ts`) — active subscription only; a paid
  consult alone never unlocks it.
- **Realtime delivery**: `GET /api/v1/realtime/token` mints a compact
  HMAC-SHA256 token (`userId + role + 5-min-exp`, keyed by
  `REALTIME_SECRET`/`BETTER_AUTH_SECRET`), verified by the standalone
  socket.io process (`realtime/server.ts`) on every connection; each socket
  joins a private `user:<id>` room server-assigns, never a client-chosen
  room. Transport under the hood is Postgres `LISTEN/NOTIFY` — messages are
  persisted via REST first, the socket push is best-effort only; the app
  stays fully functional if the socket process is down.
- Message/attachment routes: `GET /api/v1/conversations`,
  `GET/POST /api/v1/conversations/[id]/messages`,
  `POST /api/v1/conversations/[id]/read`,
  `POST /api/v1/conversations/[id]/attachments`,
  `GET /api/v1/attachments/[id]` — attachment access is bound to
  uploader + conversation (`attachmentUsableBy` in `chat-policy.ts`), so a
  guessed/leaked attachment id can't be replayed into another conversation.

## 8. Medical Profile & Settings

`GET/PUT /api/patient/profile` (web and mobile both, identical contract) —
scoped strictly to `access.id` from the session, never a client-supplied id.
Settings mutations (name/email/password) call Better Auth client methods
directly (`authClient.updateUser`, `changePassword`, `emailOtp.*`) — no
custom MediFlow route in between for those three.

## 9. Cross-cutting security patterns worth naming explicitly

1. **Three independent HMAC-SHA256 schemes** exist in the app, each with
   its own key and scope: Razorpay checkout-callback (keyed by the API key
   secret), Razorpay webhook (keyed by a separate webhook secret, over the
   raw body), and realtime socket tokens (keyed by `REALTIME_SECRET`). None
   share a key. All use `node:crypto`'s `createHmac` + `timingSafeEqual`.
2. **The same three-layer defense-in-depth pattern repeats** for every
   sensitive resource: session auth → DB-verified ownership/participant
   check (never trusting a client-supplied id) → a short-lived, narrowly
   scoped credential for the actual protected action (LiveKit JWT, 1h;
   realtime token, 15m; vault share code, patient-chosen 2h/24h/7d).
3. **No general-purpose rate limiter** exists beyond Better Auth's login
   endpoints — payment, video-token, and realtime-token routes rely solely
   on session auth + ownership checks, not throttling.
