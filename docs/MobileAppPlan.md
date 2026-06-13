# MediFlow Mobile Application Plan

End-to-end product, engineering, testing, deployment, and operations reference
for the MediFlow Android and iOS applications.

Last reviewed: 2026-06-13

Document status: Planning

Implementation status: Not started

## 1. How to use this document

This is the primary reference for the native mobile initiative. It is intended
to guide the project from product decisions through development, store
submission, production rollout, and maintenance.

Decision labels:

- **Decided**: agreed direction; implementation should follow it unless this
  document is deliberately amended.
- **Proposed**: recommended direction that should be confirmed before the
  affected milestone starts.
- **Open**: product, legal, or technical decision still required.
- **Blocker**: must be resolved before production release.

When a decision changes:

1. Update the relevant section.
2. Update the decision register near the end of this document.
3. Update `docs/Tracker.md` when implementation status changes.
4. Keep `docs/PRD.md`, `docs/AppFlow.md`, `docs/TechSpec.md`,
   `docs/Schema.md`, and `docs/Deployment.md` consistent where the mobile
   decision also affects the web platform.

This plan supersedes the original `docs/PRD.md` statement that native mobile
apps are a non-goal. The web application remains supported; mobile is an
additional client of the same MediFlow platform.

## 2. Executive summary

### 2.1 Product decision

**Decided:** Build one Expo and React Native application that produces both:

- An Android application distributed through Google Play.
- An iOS application distributed through the Apple App Store.

The application supports both `patient` and `doctor` roles. Navigation and
available actions are selected from the authenticated user's server-managed
role.

### 2.2 Architecture decision

**Decided:** The existing Next.js application remains:

- The web application.
- The API server.
- The authentication server.
- The owner of booking, payment, consultation, and authorization rules.

The mobile application is another client. It must never connect directly to
Postgres or contain server secrets.

```text
                      +----------------------+
                      |  Android application |
                      +----------+-----------+
                                 |
                                 | HTTPS / WSS
                                 |
+-------------+       +----------v-----------+       +----------------+
| Web browser +------>| Existing Next.js app +------>| Neon/Postgres  |
+-------------+       | Web UI + versioned API|       +----------------+
                      +-----+-------+---------+
                            |       |
                   +--------v-+   +-v---------------+
                   | Razorpay |   | LiveKit Cloud   |
                   +----------+   +-----------------+
                            |
                      +-----v------+
                      | Resend and |
                      | push service|
                      +------------+
```

### 2.3 Release strategy

**Proposed:** Build one application but release capability in stages:

1. Platform foundation and authentication.
2. Complete patient journey.
3. Native video consultation.
4. Push notifications and production hardening.
5. Doctor mobile workflow.
6. Store release and monitored rollout.

Patient functionality should be stabilized first because patients are the
larger mobile audience and the booking-to-call journey is the primary business
flow. Doctor functionality remains in the same application and can be enabled
after it reaches the same quality bar.

## 3. Goals and non-goals

### 3.1 Mobile v1 goals

The mobile application must allow a patient to:

1. Create an account or sign in.
2. Maintain a basic medical profile.
3. Complete telemedicine consent and intake.
4. Upload an optional medical report.
5. View live availability and select a slot.
6. Pay using Razorpay.
7. Recover the booking state after closing or restarting the app.
8. View, cancel, or reschedule an eligible appointment.
9. Receive email and push reminders.
10. Join a LiveKit video consultation.
11. View issued prescriptions and receipts.
12. Manage account information and request account deletion.

The mobile application must allow the doctor to:

1. View clinic status and upcoming appointments.
2. Search and filter appointments.
3. Open an encounter and review intake, reports, profile, and history.
4. Join the LiveKit consultation.
5. Write and autosave a SOAP note.
6. Draft and issue an immutable prescription.
7. Mark an appointment completed or no-show.
8. View patients and prior history.
9. Manage profile, weekly availability, and date overrides.

### 3.2 Platform goals

- One shared backend and database for web, Android, and iOS.
- One mobile codebase for Android and iOS.
- No duplication of booking rules or security decisions in clients.
- Zero double-bookings, enforced by the existing database index.
- Payment confirmation remains server-authoritative.
- Video media continues to flow through LiveKit, not the Next.js server.
- Medical and personal data is not placed in logs, analytics, or push payloads.
- The application remains usable on common mid-range mobile devices and
  unstable mobile networks.

### 3.3 Non-goals for mobile v1

- Separate native Swift and Kotlin applications.
- A second backend or a mobile-specific database.
- Doctor discovery or a multi-doctor marketplace.
- Chat or asynchronous messaging.
- Insurance billing.
- Full EHR interoperability.
- Medication tracking.
- Background recording of consultations.
- AI scribe unless separately approved for v1.5.
- Self-hosted WebRTC.
- Full offline clinical operation.
- Apple CallKit or Android Telecom incoming-call behavior. Consultations are
  scheduled sessions, not incoming phone calls.

## 4. Success criteria

Mobile v1 is successful when:

- A new patient can install the application and complete
  sign-in -> booking -> payment -> consultation -> prescription without using
  the website.
- A payment remains recoverable if the app is backgrounded or killed during
  Razorpay checkout.
- A patient can join a call from both a supported Android device and a
  supported iPhone.
- A doctor can complete five consecutive mobile consultations without losing
  notes or changing to the web application.
- Android and iOS use the same server-side appointment state machine.
- Store reviewers can complete the important flows with supplied review
  accounts and instructions.
- Crash-free sessions, payment failure rate, call connection failures, and
  notification delivery failures are observable.

## 5. Existing platform constraints

The following existing decisions remain binding:

1. The system is single-doctor in v1, but `doctor_profiles` remains a real
   entity.
2. Slots are computed from availability, overrides, and appointments. They are
   never materialized.
3. The partial unique database index
   `uq_appointments_doctor_slot` prevents double-booking.
4. Booking paths cancel an expired hold for a slot before attempting insertion.
5. Money is integer paise.
6. Appointment timestamps are `timestamptz`; doctor wall-clock values use the
   doctor's timezone.
7. Issued prescriptions are immutable.
8. LiveKit tokens are generated only by the server.
9. Razorpay webhooks are the authoritative payment confirmation path.
10. Every protected resource requires authentication, role validation where
    relevant, and an ownership or participant check.
11. Patient data is medical data and must not be logged.
12. Integrations must fail gracefully when unconfigured in development.

See `docs/Rules.md` for the complete web platform rules. Equivalent mobile
rules are defined in this document.

## 6. Mobile technology stack

| Area | Decision | Notes |
|---|---|---|
| Framework | **Decided:** Expo + React Native + TypeScript | One Android/iOS codebase |
| Routing | **Proposed:** Expo Router | File-based routing and deep-link support |
| Builds | **Decided:** Expo development builds and EAS Build | LiveKit and Razorpay require native modules; Expo Go is insufficient |
| Submission | **Decided:** EAS Submit plus App Store Connect/Play Console | Store metadata and reviews still require store-console work |
| Server state | **Proposed:** TanStack Query | Fetching, invalidation, polling, retry control |
| Forms | **Proposed:** React Hook Form + Zod | Mobile validation mirrors shared server contracts |
| Auth | **Decided:** Better Auth Expo integration | Existing Better Auth server remains authoritative |
| Session storage | **Decided:** `expo-secure-store` | Never use plain AsyncStorage for auth cookies |
| Video | **Decided:** LiveKit React Native SDK | Reuses the existing token endpoint and LiveKit project |
| Payments | **Decided:** Razorpay React Native SDK | Server creates orders and verifies success |
| Push | **Proposed:** Expo Notifications using Expo push service initially | APNs and FCM credentials are still required |
| Files | **Proposed:** Expo Document Picker and Image Picker | PDF, JPG, and PNG, current 5 MB limit |
| Error reporting | **Proposed:** Sentry React Native | Must scrub PII and medical fields |
| UI | **Proposed:** React Native primitives with app-owned design tokens | Web shadcn components cannot be reused |
| Unit/component tests | **Proposed:** Jest-compatible Expo setup + React Native Testing Library | Lock exact runner at project creation |
| Native E2E | **Proposed:** Maestro | Verify against development/preview builds on both platforms |

### Version policy

Do not copy version numbers from this planning document into implementation
without checking compatibility at kickoff.

- Use the latest stable Expo SDK supported by required native libraries.
- Pin exact versions in `mobile/package.json` and the lockfile.
- Verify Better Auth Expo, LiveKit, Razorpay, notifications, Sentry, and EAS
  compatibility before accepting an SDK upgrade.
- Native dependency upgrades require a new binary. They cannot be delivered
  only through an over-the-air JavaScript update.

As of this review, Better Auth's Expo guide targets Expo SDK 55, and LiveKit
requires an Expo development build rather than Expo Go.

## 7. Repository organization

**Proposed:** Keep mobile inside this repository without moving the existing
Next.js files.

```text
mediflow-v2/
|-- src/                         # Existing Next.js web UI and backend
|-- docs/
|   `-- MobileAppPlan.md
|-- mobile/
|   |-- app/                     # Expo Router routes
|   |-- src/
|   |   |-- api/                 # Typed API client
|   |   |-- auth/
|   |   |-- components/
|   |   |-- features/
|   |   |   |-- appointments/
|   |   |   |-- booking/
|   |   |   |-- consultation/
|   |   |   |-- doctor/
|   |   |   |-- notifications/
|   |   |   |-- patient/
|   |   |   `-- prescriptions/
|   |   |-- hooks/
|   |   |-- navigation/
|   |   |-- storage/
|   |   |-- theme/
|   |   `-- utils/
|   |-- assets/
|   |-- app.config.ts
|   |-- eas.json
|   |-- package.json
|   `-- tsconfig.json
`-- packages/
    `-- contracts/               # Added only when shared API contracts are ready
```

Repository rules:

- Do not move the existing Next.js app into a new folder merely to create a
  conventional monorepo.
- The mobile project gets its own `package.json`.
- Introduce npm workspaces only when shared contracts justify the added build
  configuration.
- Share pure TypeScript contracts and validation schemas, not React UI.
- Do not import server modules, Drizzle schema objects, Node-only libraries, or
  secrets into mobile.
- Mobile screens must consume versioned DTOs, not raw Drizzle rows.

## 8. Navigation and route model

**Proposed route structure:**

```text
mobile/app/
|-- _layout.tsx
|-- index.tsx                       # Resolve session and role
|-- (auth)/
|   |-- login.tsx
|   |-- verify-code.tsx
|   |-- signup.tsx
|   `-- forgot-password.tsx         # Only if password recovery is enabled
|-- (patient)/
|   |-- _layout.tsx
|   |-- (tabs)/
|   |   |-- index.tsx              # Patient home
|   |   |-- appointments.tsx
|   |   |-- prescriptions.tsx
|   |   `-- profile.tsx
|   |-- book/
|   |   |-- intake.tsx
|   |   |-- slot.tsx
|   |   |-- payment.tsx
|   |   `-- confirmation.tsx
|   |-- appointments/[id].tsx
|   `-- receipt/[id].tsx
|-- (doctor)/
|   |-- _layout.tsx
|   |-- (tabs)/
|   |   |-- index.tsx              # Doctor home
|   |   |-- appointments.tsx
|   |   |-- patients.tsx
|   |   `-- settings.tsx
|   |-- encounter/[id].tsx
|   |-- patients/[id].tsx
|   `-- schedule.tsx
|-- call/[id].tsx
|-- settings/
|   |-- account.tsx
|   |-- notifications.tsx
|   |-- privacy.tsx
|   `-- delete-account.tsx
`-- +not-found.tsx
```

Navigation rules:

- Guests may access only auth, legal, support, and account-deletion request
  information.
- Patients are redirected away from doctor groups.
- Doctors are redirected away from patient-only workflows unless a specific
  cross-role capability is deliberately added.
- Role checks in the app improve UX only. Every API still performs server-side
  role and ownership validation.
- Call routes are outside role tabs because both roles use the same native call
  experience.

## 9. Environment strategy

Three isolated environments are required.

| Environment | Purpose | Backend | Mobile distribution |
|---|---|---|---|
| Development | Local coding and simulators/devices | Local Next.js + local Postgres | Expo development build |
| Staging | Integration, payment test mode, store previews | Staging Vercel + staging Neon | EAS preview build, TestFlight, Play internal |
| Production | Real patients and payments | Production Vercel + production Neon | App Store and Play production |

Each environment requires separate:

- API base URL.
- Better Auth URL and trusted mobile scheme.
- Database.
- Razorpay mode/keys and webhook.
- LiveKit project or clearly isolated room namespace.
- Resend sender configuration.
- Push credentials and project configuration.
- Sentry environment.
- EAS update channel.
- App display-name suffix for non-production builds.
- Bundle identifiers/package names.

Example identifiers, subject to branding and domain ownership:

| Environment | iOS bundle ID | Android package | URL scheme |
|---|---|---|---|
| Development | `com.<owner>.mediflow.dev` | `com.<owner>.mediflow.dev` | `mediflow-dev` |
| Staging | `com.<owner>.mediflow.staging` | `com.<owner>.mediflow.staging` | `mediflow-staging` |
| Production | `com.<owner>.mediflow` | `com.<owner>.mediflow` | `mediflow` |

Local-device rule:

- `localhost` on a physical phone refers to that phone, not the development
  computer.
- Development builds must use a reachable LAN URL or an approved secure tunnel.
- Auth callbacks, uploads, and LiveKit tokens must be tested from real devices,
  not only simulators.

## 10. API strategy

### 10.1 Core decision

**Proposed:** Introduce a versioned mobile-safe API under `/api/v1`.

The existing web endpoints may continue serving the web application. Versioned
endpoints should call the same domain functions rather than duplicate booking,
payment, authorization, or consultation logic.

Reasons:

- Existing routes sometimes return raw database row shapes.
- Several web pages read directly from server libraries and have no API
  equivalent.
- Mobile releases cannot be deployed atomically with backend changes.
- DTO versioning allows old app versions to keep working during rollout.
- Mobile networks require explicit idempotency and recovery semantics.

### 10.2 API contract rules

Every `/api/v1` endpoint must:

1. Resolve the Better Auth session.
2. Validate the role when relevant.
3. Validate parameters, query strings, and bodies with Zod.
4. Perform an ownership or participant check.
5. Return stable DTOs containing only fields required by the client.
6. Return ISO 8601 UTC timestamps.
7. Include user-actionable, stable error codes.
8. Avoid exposing internal database, provider, or stack-trace details.
9. Attach a request ID for diagnostics.
10. Avoid logging request bodies that may contain medical data.

Recommended error envelope:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "That slot is no longer available.",
    "details": null,
    "requestId": "req_..."
  }
}
```

Clients may display `message`, but behavior must branch on `code`, not by
matching English text.

### 10.3 Time and money

- Money remains integer paise.
- API field names use `feeInPaise`, `amountInPaise`, and `refundInPaise`.
- Timestamps are returned as UTC ISO strings.
- Date-only fields remain `YYYY-MM-DD`.
- Time-only availability values remain `HH:mm`.
- Responses affecting countdowns include `serverTime`.
- Slot labels are formatted on the client using the doctor timezone returned by
  the server.
- The device clock is never trusted for payment hold validity or call access.

### 10.4 Pagination

List endpoints must use cursor pagination:

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

Required for:

- Patient appointments.
- Patient prescriptions.
- Doctor appointments.
- Doctor patients.
- Patient consultation history.

### 10.5 Idempotency

**Blocker:** Mobile mutations must be retry-safe.

The client sends an `Idempotency-Key` for:

- Appointment creation.
- Payment order creation.
- Reschedule.
- Cancellation.
- Prescription issue.
- Appointment outcome.
- Push-token registration.
- Account-deletion request.

The server stores or derives a stable result for repeated requests. A network
timeout after server success must not create a duplicate booking or repeat an
irreversible action.

### 10.6 Existing endpoint readiness

| Existing capability | Current route | Mobile readiness |
|---|---|---|
| Better Auth | `/api/auth/*` | Adapt with Better Auth Expo server plugin and trusted schemes |
| Available slots | `GET /api/slots` | Logic reusable; expose stable `/api/v1/slots` DTO |
| Patient appointments | `GET /api/appointments` | Adapt raw rows to paginated DTO |
| Create appointment hold | `POST /api/appointments` | Reuse logic; add idempotency, consent record, structured intake |
| Appointment detail | `GET /api/appointments/:id` | Adapt and include server time and allowed actions |
| Cancel | `POST /api/appointments/:id/cancel` | Reuse rules; resolve refund policy first |
| Reschedule | `POST /api/appointments/:id/reschedule` | Reuse DB uniqueness; add idempotency |
| Start payment | `POST /api/appointments/:id/payment` | Reuse order creation; compatible with native Razorpay |
| Verify payment | `POST /api/appointments/:id/payment/verify` | Reuse server verification |
| Video token | `POST /api/appointments/:id/video-token` | Reuse; native client consumes token and URL |
| Room presence | `GET /api/appointments/:id/presence` | Reusable as optional polling |
| Report upload | `POST /api/reports` | Test React Native multipart behavior and progress |
| Report download | `GET /api/reports/:id` | Must authorize both owning patient and appointment doctor |
| Patient profile update | `PUT /api/patient/profile` | Add GET and stable DTO |
| Doctor profile | `/api/doctor/profile` | Adapt under versioned API |
| Availability rules | `/api/doctor/availability/rules` | Adapt under versioned API |
| Availability overrides | `/api/doctor/availability/overrides` | Adapt under versioned API |
| SOAP note | `/api/appointments/:id/consult-note` | Reuse; improve conflict/retry behavior |
| Prescription draft/issue | Existing appointment prescription routes | Reuse rules; add idempotency to issue |
| Appointment outcome | `/api/appointments/:id/status` | Reuse state transition |

### 10.7 Required new read endpoints

The web uses Server Components for these views, so mobile needs explicit APIs:

- `GET /api/v1/bootstrap`
  - User summary, role, server time, environment-safe app configuration,
    supported feature flags, minimum supported version.
- `GET /api/v1/patient/home`
  - Next appointment, summary counts, doctor card, profile completeness, recent
    prescriptions.
- `GET /api/v1/patient/profile`
- `GET /api/v1/patient/prescriptions`
- `GET /api/v1/patient/appointments/:id/receipt`
- `GET /api/v1/doctor/home`
- `GET /api/v1/doctor/appointments`
- `GET /api/v1/doctor/encounters/:id`
- `GET /api/v1/doctor/patients`
- `GET /api/v1/doctor/patients/:id`
- `GET /api/v1/doctor/schedule`
- `GET /api/v1/doctor/next-consult`

### 10.8 Required new operational endpoints

- `POST /api/v1/devices`
- `DELETE /api/v1/devices/:id`
- `GET /api/v1/notification-preferences`
- `PUT /api/v1/notification-preferences`
- `GET /api/v1/payment-status/:appointmentId`, or equivalent status in
  appointment detail.
- `POST /api/v1/account-deletion-requests`
- `GET /api/v1/account-deletion-requests/current`
- `GET /api/v1/app-config`
- Optional `POST /api/v1/client-events` for tightly controlled, non-medical
  operational events.

## 11. Authentication and session management

### 11.1 Sign-in methods

**Proposed mobile v1 decision:**

- Primary: email one-time code.
- Secondary: email and password for existing users who have set a password.
- Defer Google sign-in until Sign in with Apple and both store configurations
  are ready.

Keeping social login out of initial mobile v1 reduces callback, provider, and
App Store compliance complexity. The same Better Auth account remains usable on
web and mobile.

### 11.2 Better Auth integration

Required backend changes:

- Install and configure the Better Auth Expo server plugin.
- Add production and staging app schemes to `trustedOrigins`.
- Permit broad `exp://` patterns only in development.
- Keep production rate limiting enabled.
- Keep role assignment server-controlled.

Required mobile behavior:

- Initialize the Better Auth client with the environment API URL.
- Use the Better Auth Expo client plugin.
- Store session cookies and session cache in `expo-secure-store`.
- Add the cookie manually to protected API requests as documented by Better
  Auth.
- Use `credentials: "omit"` when manually adding the mobile cookie if required
  by the integration.
- Clear session, secure storage, query cache, and sensitive local state on
  logout.

### 11.3 Session lifecycle

The app must handle:

- Cold launch with a cached session.
- Session revalidation with the server.
- Expired or revoked sessions.
- Password change revoking other sessions.
- Role changes, especially patient promotion to doctor.
- Logout from one device.
- Logout from all devices.
- A 401 from any protected endpoint.

On 401:

1. Clear server-state caches containing protected data.
2. Clear the locally cached session.
3. Redirect to login.
4. Preserve only a safe return route, never form contents containing medical
   information.

### 11.4 Deep links

Required deep-link destinations:

- Auth callbacks.
- Appointment detail.
- Booking resume.
- Call join.
- Prescription detail.
- Account deletion and privacy pages.

Production should support:

- Custom scheme: `mediflow://`.
- iOS Universal Links.
- Android App Links.

Custom schemes are required for native auth callbacks; verified HTTPS links are
preferred for links received by email or notification because they can fall
back to the website when the app is not installed.

## 12. Data-model changes required for mobile

Exact schema names remain implementation decisions, but the following
capabilities are required.

### 12.1 Structured intake and consent

**Blocker:** Consent is currently a web checkbox and is not persisted with the
appointment. Emergency red-flag detection is currently client-side.

Recommended appointment fields:

- `visitReason`
- `symptoms`
- `consentVersion`
- `consentedAt`
- `consentSource` (`web`, `ios`, `android`)
- Optional `triageWarningShownAt`

The server must:

- Require consent fields during appointment creation.
- Re-run deterministic red-flag checks server-side.
- Return an explicit emergency warning result.
- Never describe the red-flag check as diagnosis.
- Retain the exact consent version accepted for audit purposes.

`intakeNote` may remain temporarily for compatibility, but new clients should
use structured fields.

### 12.2 Push devices

Recommended `push_devices` fields:

- `id`
- `userId`
- `expoPushToken`
- `platform` (`ios`, `android`)
- `installationId`
- `appVersion`
- `deviceName` or model only if operationally necessary
- `notificationsEnabled`
- `lastSeenAt`
- `disabledAt`
- `createdAt`
- `updatedAt`

Constraints:

- A token must be unique.
- A user may have multiple active devices.
- Invalid or unregistered tokens are disabled, not endlessly retried.
- Logout unregisters or disables the current installation.

### 12.3 Notification preferences

Recommended preferences:

- Appointment confirmation.
- Appointment reminder.
- Reschedule/cancellation.
- Prescription issued.
- Service announcements.

Essential transactional email may remain enabled where legally or operationally
required. Marketing notification consent must be separate; marketing is not in
mobile v1.

### 12.4 Payment refunds

**Blocker:** Refund policy and automation are unresolved.

Recommended payment fields:

- `refundId`
- `refundAmountInPaise`
- `refundReason`
- `refundRequestedAt`
- `refundedAt`
- `providerStatus`

Required cases:

- Eligible patient cancellation.
- Payment captured after a hold expired and the slot was rebooked.
- Duplicate or provider-retried capture.
- Manual support refund.

### 12.5 Idempotency records

Use either:

- A general `idempotency_keys` table scoped to user, operation, and key.
- Operation-specific unique client request IDs.

Records require:

- User ID.
- Operation.
- Key.
- Request fingerprint.
- Stored response status/body or resulting resource ID.
- Expiration.

### 12.6 Account deletion requests

Recommended fields:

- Requester user ID.
- Requested timestamp.
- Status.
- Identity verification timestamp.
- Completion or rejection timestamp.
- Retention/legal reason where data cannot be immediately erased.
- Operator notes stored without unnecessary medical detail.

The deletion process must distinguish:

- Authentication and profile data that can be deleted.
- Medical, prescription, payment, tax, fraud, or audit data that may require a
  retention period.
- Data that should be anonymized rather than physically deleted.

Legal counsel must approve the production retention matrix.

## 13. Patient mobile experience

### 13.1 First launch

1. Show a concise product explanation.
2. Offer sign in and account creation.
3. Do not request notification, camera, microphone, photo, or file permissions
   before their relevant feature is used.
4. Display privacy and terms links.
5. After authentication, route from the server role.

### 13.2 Patient home

Required content:

- Next appointment.
- Join button when the server says the call window is open.
- Pending-payment recovery CTA.
- Book consultation CTA.
- Profile completeness.
- Recent prescriptions.
- Doctor summary, fee, and slot duration.
- Upcoming and completed counts.

The home response should be one aggregated API request to reduce mobile latency.

### 13.3 Medical profile

Fields mirror the existing web profile:

- Date of birth.
- Gender.
- Blood group.
- Allergies.
- Chronic conditions.
- Current medications.
- Emergency contact name.
- Emergency contact phone.

Requirements:

- All fields remain optional unless a product/legal decision changes this.
- "None known" should be distinguishable from blank where clinically useful.
- Do not silently normalize phone numbers without showing the result.
- Validation runs on both client and server.
- Unsaved changes require a navigation warning.

### 13.4 Booking intake

Required inputs:

- Visit reason.
- Symptom/details text.
- Optional report.
- Explicit telemedicine consent.

Emergency behavior:

- Show a prominent emergency warning when red-flag phrases are detected.
- Provide the appropriate local emergency instruction approved for the release
  region.
- Do not present the detector as a medical assessment.
- The server repeats the check.
- **Open:** decide whether red flags warn but allow continuation, or block
  scheduled booking until the user acknowledges the warning.

### 13.5 Report upload

Supported v1 types:

- PDF.
- JPEG.
- PNG.

Current limit: 5 MB.

Required mobile behavior:

- Pick from files or images.
- Show file name, type, and size before upload.
- Show upload progress.
- Allow retry and removal before the appointment is created.
- Strip image metadata where practical, especially location metadata.
- Never log filenames if they may contain patient information.
- Avoid duplicate uploads when a request is retried.

**Proposed:** Move report storage to object storage before meaningful mobile
scale if Neon database growth or serverless request-size limits become a risk.
The current Postgres `bytea` approach can remain for initial low volume if
measured and explicitly accepted.

### 13.6 Slot selection

- Query the server for a bounded date range.
- Group slots by doctor-local date.
- Display doctor timezone.
- Disable past or stale slots.
- Refresh when returning from background.
- On 409, explain that another patient took the slot and refresh.
- Never calculate authoritative availability in mobile.

### 13.7 Payment and booking recovery

The payment screen displays:

- Doctor.
- Appointment date and time.
- Amount in INR.
- Hold expiry countdown based on server time.
- Cancellation/refund summary.
- Pay action.

Recovery rules:

- Persist only the appointment ID and safe booking stage locally.
- On app restart, fetch appointment and payment status.
- If confirmed, show confirmation.
- If pending and hold is valid, allow payment retry.
- If expired, discard local booking state and return to slot selection.
- If Razorpay reports success but verification is pending, poll server status.
- If the webhook confirms while the client is closed, the next fetch must show
  confirmed.
- Do not mark an appointment confirmed based solely on a client callback.

### 13.8 Appointments

Appointment list groups:

- Pending payment.
- Upcoming.
- Past.
- Cancelled/no-show.

Appointment detail includes:

- Human status.
- Doctor and time.
- Intake summary.
- Report references.
- Payment status.
- Allowed actions calculated by the server.
- Join availability.
- Prescription and outcome when available.
- Receipt for paid appointments.

### 13.9 Cancellation and rescheduling

- Server remains authoritative for the two-hour cancellation window.
- Irreversible actions require confirmation.
- Rescheduling retains the original payment.
- New slot selection uses the same live availability and DB uniqueness rules.
- On conflict, refresh and keep the user in the slot picker.
- Any reminder schedule must update after rescheduling.
- Cancellation behavior must clearly state whether and when money is refunded.

### 13.10 Prescriptions and receipts

Prescriptions:

- Display only issued prescriptions to patients.
- Show diagnosis, advice, validity, medicines, schedule, route, food relation,
  duration, and instructions.
- Allow safe sharing/printing only after explicit user action.
- Do not persist prescription files in a public downloads directory.

Receipts:

- Show amount, currency, payment ID/order reference as appropriate, appointment
  date, patient, doctor, and payment status.
- **Open:** native-rendered receipt versus server-generated PDF/HTML.
- Branded prescription PDF remains v1.5 unless separately promoted.

## 14. Doctor mobile experience

### 14.1 Doctor home

Required content:

- Today's appointment count.
- Upcoming count.
- Completed count.
- Collected amount in paise formatted as INR.
- Next patient.
- Waiting-room presence.
- Today's schedule.
- Setup checklist when profile or availability is incomplete.

### 14.2 Appointments

- Today, upcoming, and past sections.
- Status filter.
- Search by patient name, email, and intake summary.
- Cursor pagination.
- Pull to refresh.
- Clear distinction between pending payment, confirmed, completed, cancelled,
  and no-show.

### 14.3 Encounter

Required information:

- Patient identity.
- Appointment status and time.
- Returning-patient indicator.
- Medical profile snapshot.
- Allergies highlighted without relying only on color.
- Intake and attached reports.
- Join-call action.
- SOAP note.
- Prescription composer.
- Past consultation history.
- Medicine history.
- Outcome actions.

Doctor access to reports must use participant-aware authorization. The current
patient-only report download route is insufficient for mobile and should also
be corrected for web behavior.

### 14.4 SOAP notes

Requirements:

- Debounced autosave.
- Visible `typing`, `saving`, `saved`, and `error` states.
- Flush on app background where possible.
- Do not claim data is saved until acknowledged by the server.
- Prevent completion if the latest required note state is unsynced.
- Detect stale updates from another doctor session or web tab.

**Open:** encrypted local draft persistence. Mobile v1 may require a network
connection for clinical edits, but temporary loss of connectivity must not
silently discard text. The implementation milestone must select either:

- An approved encrypted local draft store.
- A strict online-only workflow with in-memory preservation, navigation
  blocking, and explicit unsaved-state handling.

### 14.5 Prescription

- Draft remains editable.
- Issue requires a confirmation explaining permanent locking.
- Issue request is idempotent.
- The server rejects edits after issue.
- The app refreshes authoritative prescription state after issue.
- Medicine row limits and field validation mirror server Zod schemas.

### 14.6 Patients and history

- Search patient roster.
- Show visit count and last visit.
- Show medical profile.
- Show completed consultations, issued prescriptions, and medicine history.
- Avoid bulk offline caching of the patient roster or clinical histories.

### 14.7 Availability

- View and edit weekly rules.
- Add full-day or partial blocked overrides.
- Add extra sessions.
- Render in the doctor timezone.
- Validate start time before end time.
- Confirm delete actions.
- Refresh patient availability after a mutation.

## 15. Razorpay integration

### 15.1 Payment sequence

```text
Mobile app             Next.js API              Razorpay
    |                       |                       |
    | create appointment    |                       |
    |---------------------->| pending_payment hold  |
    |<----------------------| appointment + expiry  |
    |                       |                       |
    | start payment         | create/reuse order    |
    |---------------------->|---------------------->|
    |<----------------------| order ID + key ID     |
    | open native checkout  |                       |
    |---------------------------------------------->|
    |<----------------------------------------------|
    | callback IDs/signature|                       |
    |---------------------->| verify signature      |
    |<----------------------| current state         |
    |                       |<----------------------|
    |                       | signed webhook        |
    |                       | confirm idempotently   |
```

### 15.2 Security rules

- Only the Razorpay key ID may be present in the app.
- Key secret and webhook secret stay server-side.
- Orders are created server-side.
- Amount comes from the server payment record, never from mobile input.
- Callback signature is verified server-side.
- Webhook signature is verified using the raw body.
- Payment confirmation is idempotent.
- Logs contain appointment/order IDs, not patient identity or intake data.

### 15.3 Failure cases

The app and backend must handle:

- User closes checkout.
- Network disappears before callback.
- Callback arrives but the app is killed.
- Webhook arrives before callback.
- Callback and webhook race.
- Payment fails.
- Payment is captured after hold expiry.
- Slot is no longer valid.
- Razorpay is unavailable.
- Refund is initiated or delayed.

**Blocker:** Payment captured after expiry must have an automatic refund or a
well-defined operational queue with alerting and response ownership. A log line
alone is not sufficient for production mobile scale.

## 16. LiveKit video integration

### 16.1 Build requirement

LiveKit uses native WebRTC modules and does not work in Expo Go. Development,
preview, and production must use custom Expo development/EAS builds with the
LiveKit Expo config plugins.

### 16.2 Join sequence

1. Open appointment detail.
2. Ask the server whether joining is allowed.
3. Request camera and microphone permissions in context.
4. Show pre-join camera/mic preview.
5. Request a short-lived token from the existing participant-checked endpoint.
6. Connect to LiveKit using returned `url` and `token`.
7. Start the native audio session.
8. Show remote and local participant tracks.
9. Stop the audio session and release media on leave.

### 16.3 Existing server rules

- Appointment must be confirmed.
- User must be the patient or appointment doctor.
- Join opens 10 minutes before the scheduled start.
- Join closes 30 minutes after scheduled end.
- Token TTL is currently one hour.
- Room name is derived from appointment ID.

### 16.4 Native call requirements

- Camera and microphone permission explanations.
- Camera on/off.
- Microphone mute/unmute.
- Front/rear camera switch.
- Speaker/Bluetooth/headset handling.
- Participant connection state.
- Reconnection after network transition.
- Friendly behavior when the app backgrounds.
- Keep screen awake during an active consultation.
- Handle phone-call/audio interruptions.
- Handle permission denial and settings redirection.
- Do not record by default.
- Do not put medical details in LiveKit participant metadata.

### 16.5 Call testing matrix

- Android patient to iOS doctor.
- iOS patient to Android doctor.
- Web patient to mobile doctor.
- Mobile patient to web doctor.
- Wi-Fi to mobile-data transition.
- Slow and lossy network.
- Bluetooth headset.
- Wired headset where supported.
- Incoming phone call interruption.
- App background and foreground.
- Permission denied, then enabled from settings.

## 17. Push notifications

### 17.1 Notification types

Mobile v1 should support:

- Booking confirmed.
- Appointment reminder.
- Appointment rescheduled.
- Appointment cancelled.
- Prescription issued.
- Payment/refund status when user action is required.

### 17.2 Payload privacy

Push notifications may appear on a lock screen. Payloads must be generic.

Good:

- "Your consultation starts in 30 minutes."
- "Your prescription is available in MediFlow."

Avoid:

- Diagnosis.
- Symptoms.
- Medicine names.
- Patient name.
- Doctor notes.
- Report filename.

Use appointment or resource IDs only in private routing data.

### 17.3 Delivery architecture

**Proposed:** The existing reminder scheduler invokes a notification service
that attempts email and push independently.

Do not use one `reminderSentAt` value for multiple channels. Track email and
push delivery separately so one failed channel can retry without duplicating
the other.

Required behavior:

- Store device tokens per installation.
- Disable invalid tokens.
- Record provider response IDs and status.
- Retry transient failures with a cap.
- Do not mark delivery successful when the provider returns an error.
- Update reminders after rescheduling.
- Deduplicate by appointment, channel, and notification type.
- Deep-link to the appointment.

### 17.4 Permission timing

Ask for notification permission after a meaningful action, preferably after
the first successful booking, with an explanation that reminders help the user
join on time.

## 18. Offline and unreliable-network behavior

### 18.1 General policy

**Decided:** The server remains the source of truth. Mobile v1 is not a fully
offline medical application.

### 18.2 Cache policy

- Keep authenticated server data in memory by default.
- Do not persist bulk medical records, reports, notes, or prescriptions in
  AsyncStorage.
- SecureStore is for small secrets/session material, not a medical-record cache.
- Clear query caches on logout or role change.
- Images and downloaded documents should be temporary and removed when no
  longer needed.

### 18.3 Network UX

- Show an offline banner.
- Distinguish offline, timeout, server error, validation error, and conflict.
- Allow safe GET retries.
- Retry mutations only when protected by idempotency.
- Refresh stale slots after reconnection.
- Refresh payment state after reconnection.
- Do not hide a failed clinical save behind optimistic UI.

### 18.4 Background behavior

On background:

- Stop nonessential polling.
- Flush doctor drafts when possible.
- Preserve the active booking appointment ID.
- Keep an active LiveKit session only as supported and deliberately configured.

On foreground:

- Revalidate session.
- Refresh appointment/payment state.
- Recompute allowed actions using server time.
- Refresh call eligibility.

## 19. Mobile design system

### 19.1 Principles

The web design principles continue:

- Patients are non-technical; each screen has one obvious primary action.
- The doctor needs dense but scannable clinical workflows.
- The visual tone is calm, clinical, and trustworthy.
- Errors explain what happened and what to do next.

### 19.2 Shared design tokens

Share semantic values, not web CSS:

- Color roles.
- Typography scale.
- Spacing scale.
- Radius scale.
- Status labels and meanings.
- Motion durations.
- Icon size conventions.

Do not attempt to import shadcn web components into React Native.

### 19.3 Platform behavior

Use common product structure while respecting platform conventions:

- Native back behavior.
- iOS safe areas and swipe-back.
- Android system back.
- Keyboard avoidance.
- Date/time pickers appropriate to each platform.
- Native share sheet.
- System permission dialogs.
- Dynamic text sizing.
- Dark mode only when fully tested; otherwise ship a deliberate light theme.

### 19.4 Accessibility

Minimum requirements:

- Screen-reader labels and hints.
- Logical focus order.
- Minimum touch targets.
- Text resizing without clipping.
- Sufficient color contrast.
- Status is never conveyed by color alone.
- Reduced-motion support.
- Captions/alternatives for non-text content where relevant.
- Form errors announced and associated with fields.
- Call controls remain operable with VoiceOver and TalkBack.

## 20. Security, privacy, and compliance

This section is an engineering baseline, not legal advice.

### 20.1 Secrets

Never embed:

- Database URL.
- Better Auth secret.
- Razorpay key secret.
- Razorpay webhook secret.
- LiveKit API secret.
- Resend API key.
- Sentry auth token.
- APNs private key.
- FCM service-account private key.

Client-visible values such as API URL, Razorpay key ID, LiveKit URL returned by
the token endpoint, and Sentry public DSN must still be environment-scoped.

### 20.2 Data handling

- HTTPS only in staging and production.
- Store auth material in SecureStore.
- Do not log names, emails, phone numbers, symptoms, notes, diagnoses,
  prescriptions, report names, or file content.
- Redact request/response bodies from monitoring.
- Do not send health data to product analytics.
- Do not include health data in push notifications.
- Minimize clipboard use.
- Blur sensitive screens in the app switcher where practical.
- Define temporary-file cleanup.
- Restrict production database and provider dashboard access.
- Audit doctor access to patient resources where legally or operationally
  required.

### 20.3 Authorization

Every mobile endpoint follows:

```text
session -> role -> input validation -> ownership/participant -> action
```

Never trust:

- Client role.
- Client amount.
- Client appointment status.
- Client cancellation eligibility.
- Client call window.
- Client prescription lock state.
- Client-provided patient or doctor ID without ownership validation.

### 20.4 Account deletion

Apple requires in-app account deletion for applications that support account
creation. Google Play requires an in-app deletion path and a functional web
resource for deletion requests.

MediFlow must provide:

- In-app request flow.
- Web deletion request page.
- Identity verification.
- Explanation of retained records and retention basis.
- Request status and support path.
- Completion process across Better Auth, database records, push devices, and
  third-party processors where applicable.

Because this is a healthcare application, "delete everything immediately" may
conflict with medical, prescription, payment, or regulatory retention duties.
A legally reviewed deletion/anonymization matrix is a production blocker.

### 20.5 Store privacy declarations

Before submission, inventory every collected data type and purpose for:

- Apple App Privacy.
- Google Play Data Safety.
- Google Play Health Apps declaration/policies where applicable.

Declarations must match actual SDK behavior, including Sentry, Expo push,
Razorpay, LiveKit, Better Auth, and any analytics SDK.

### 20.6 Healthcare and regional review

**Blocker:** Obtain legal and clinical review for the launch region, including:

- Telemedicine consent wording.
- Emergency-care wording and escalation.
- Doctor registration/credential display.
- Prescription and record-retention requirements.
- Privacy notice and data-subject rights.
- Cross-border data processing by cloud providers.
- Refund and cancellation terms.
- Minor users and guardian consent.
- Recording prohibition or consent if recording is ever introduced.

## 21. Observability and support

### 21.1 Error monitoring

Use separate Sentry projects or clear environment/release tagging for web and
mobile.

Capture:

- Native crashes.
- JavaScript crashes.
- Failed API requests by stable error code.
- App version and platform.
- LiveKit connection state failures.
- Razorpay checkout/verification stage failures.
- Push registration/delivery failures.

Do not capture medical form values or API bodies.

### 21.2 Operational metrics

Recommended aggregate metrics:

- Sign-in success/failure rate.
- Booking-start to booking-confirmed conversion.
- Slot conflict rate.
- Payment order, callback, webhook, and refund counts.
- Booking recovery success.
- Call token denial reasons.
- Call connection success and reconnect counts.
- Push registration and delivery error rates.
- Crash-free session rate.
- API latency and error rate by route/code.

### 21.3 Support tools

Minimum production support capability:

- Search by appointment ID, payment ID, or user ID.
- View state transition timestamps.
- View payment/refund status.
- Re-send safe transactional notifications.
- Disable a push token.
- Track account deletion requests.
- Record manual intervention without medical notes in general logs.

**Open:** Whether these tools live in a restricted admin page or are initially
handled through provider dashboards and audited database operations.

## 22. Testing strategy

### 22.1 Test layers

| Layer | Purpose |
|---|---|
| Shared contract tests | DTO and Zod compatibility between backend and mobile |
| Unit tests | Formatting, reducers, allowed actions, retry decisions, deep-link parsing |
| Component tests | Forms, validation, errors, accessibility, role-based rendering |
| API integration tests | Auth, ownership, idempotency, state transitions, payment recovery |
| Native E2E | Real navigation and native modules in preview builds |
| Manual device tests | Camera, microphone, payment, push, interruptions, poor network |
| Store beta tests | TestFlight and Play internal/closed tracks |

### 22.2 Required automated journeys

Patient:

1. OTP sign-in and logout.
2. Session restoration after restart.
3. Medical profile update.
4. Booking with consent and optional report.
5. Slot conflict.
6. Payment success.
7. Payment cancellation and retry.
8. App restart during pending payment.
9. Appointment cancel.
10. Appointment reschedule.
11. Prescription display.
12. Account-deletion request.

Doctor:

1. Role routing.
2. Appointment list/filter/search.
3. Encounter ownership denial.
4. SOAP autosave and retry.
5. Draft prescription.
6. Issue prescription once.
7. Reject edit after issue.
8. Complete/no-show transition.
9. Availability add/delete.
10. Patient history.

Shared:

1. Video-token eligibility.
2. Camera/microphone permission paths.
3. Push deep link.
4. 401 session expiry.
5. Minimum-version enforcement.
6. Offline and reconnection.

### 22.3 Device matrix

At minimum:

- Current supported iOS version on a recent iPhone.
- Oldest supported iOS version on a real or representative device.
- Current Android version.
- Oldest supported Android version.
- Mid-range Android device with limited memory.
- Small phone.
- Large phone.
- **Open:** tablet support in v1.

The supported OS floor must be chosen after checking Expo, LiveKit, Razorpay,
and store requirements at implementation kickoff.

### 22.4 Test data safety

- Staging uses test patients and synthetic medical data only.
- Razorpay uses test mode.
- Staging has a dedicated database.
- Never run destructive E2E setup against production.
- Store-review accounts contain no real patient data.

## 23. Development workflow

### 23.1 Initial setup

1. Confirm app name, owner, bundle IDs, package names, and URL schemes.
2. Create Expo/EAS project.
3. Create development build for Android and iOS.
4. Configure environment-specific API URLs.
5. Add Better Auth Expo integration.
6. Establish typed API client and contract package.
7. Add error monitoring with redaction.
8. Establish unit/component/native E2E test harnesses.

### 23.2 Daily development

- Run the local Next.js backend and local Postgres.
- Use a physical device or simulator with a development build.
- Use a LAN/tunnel API URL reachable from the device.
- Use mock payments for ordinary UI work.
- Use Razorpay test mode for integration verification.
- Use a test LiveKit project.
- Keep production credentials unavailable to local builds.

### 23.3 Quality gates

Before merging:

- Typecheck passes.
- Lint passes.
- Unit/component tests pass.
- API contract tests pass.
- No secrets or generated credentials are added.
- Privacy review for new SDKs or data fields.

Before a preview build:

- Backend staging deployment is healthy.
- Database migrations are applied.
- Mobile E2E smoke tests pass.
- Release notes identify native dependency changes.

Before production:

- Full launch checklist in this document passes.

## 24. Build and deployment

### 24.1 EAS profiles

Recommended profiles:

- `development`
  - Development client.
  - Internal distribution.
  - Development API.
- `preview`
  - Release-like binary.
  - Staging API.
  - TestFlight and Play internal/closed testing.
- `production`
  - Production bundle/package.
  - Production API.
  - Store signing and production update channel.

### 24.2 Signing

Required:

- Apple Developer Program membership.
- App Store Connect application.
- iOS distribution certificate and provisioning profile, managed by EAS or
  deliberately supplied.
- Google Play Console application.
- Android upload/signing key.
- Secure ownership and backup of signing credentials.
- App Store Connect API key for automated submission if used.
- Google service account for EAS submission after the first manual Play upload.

Signing keys must not be committed to Git.

### 24.3 Over-the-air updates

**Proposed:** Use EAS Update for compatible JavaScript and asset fixes.

Rules:

- Separate development, staging, and production channels.
- Set a runtime-version policy.
- Do not send an update requiring a native module absent from the installed
  binary.
- Test the exact production update on a staging channel first.
- Maintain rollback instructions.
- Security-sensitive and substantial behavior changes still follow normal QA.

### 24.4 Backend deployment order

For backward-compatible releases:

1. Deploy additive database migrations.
2. Deploy backend supporting old and new mobile versions.
3. Verify staging.
4. Release mobile build.
5. Monitor adoption.
6. Remove deprecated fields/endpoints only after the supported-version window.

Never deploy a backend change that instantly breaks the currently published app.

### 24.5 Minimum supported version

The bootstrap/config response should support:

- Latest available version.
- Minimum supported version.
- Optional update message.
- Force-update flag only for security or incompatible API changes.
- Platform-specific store URL.

Most releases should be optional updates. Forced updates must be exceptional.

## 25. Store submission

### 25.1 Required assets

- App name.
- Subtitle/short description.
- Full description.
- App icon.
- Splash assets.
- Android feature graphic.
- Phone screenshots for required device sizes.
- Optional preview video.
- Support URL.
- Privacy-policy URL.
- Terms URL.
- Account-deletion URL.
- Contact email.
- Review notes.
- Demo patient and doctor accounts.

### 25.2 Permission descriptions

Prepare clear, truthful descriptions for:

- Camera: video consultation.
- Microphone: audio during consultation.
- Notifications: appointment and prescription updates.
- Photos/files: attach medical reports.

Do not request contacts, location, Bluetooth, calendar, or background modes
unless a concrete reviewed feature needs them.

### 25.3 Apple submission

Process:

1. Create the App Store Connect record.
2. Configure identifiers, capabilities, privacy details, and age rating.
3. Build and submit to TestFlight.
4. Complete internal testing.
5. Complete external beta review if used.
6. Upload metadata and screenshots.
7. Supply review credentials and a precise review script.
8. Explain Razorpay as payment for a real-time one-to-one medical service.
9. Submit for App Review.
10. Use manual or phased release after approval.

If Google or another third-party social login is offered for the primary
account, review Apple guideline 4.8 and provide the required equivalent login
option. Email OTP/password-only login avoids that specific social-login issue.

### 25.4 Google Play submission

Process:

1. Create the Play Console application.
2. Complete app access, content rating, target audience, ads, Data Safety,
   health-app, and account-deletion declarations.
3. Configure Play App Signing.
4. Upload the first Android App Bundle manually.
5. Run internal testing.
6. Run closed testing as required for the developer account.
7. Fix pre-launch report issues.
8. Create production release.
9. Use staged rollout.

### 25.5 Review-account script

Provide reviewers:

- A patient account.
- A doctor account.
- OTP access instructions or fixed review-safe login mechanism.
- A pre-created confirmed appointment inside the call window if video must be
  reviewed.
- Razorpay test-mode instructions if permitted, or a review-safe payment path.
- Explanation that no real medical advice or emergency service is provided in
  the review environment.
- Steps to find account deletion.

The review path must not depend on reading server logs for an OTP.

## 26. Production rollout

### 26.1 Rollout stages

**Proposed:**

1. Team-only development builds.
2. Internal patient and doctor testing.
3. Small invited clinic cohort.
4. TestFlight/Play closed beta.
5. Store approval with manual release.
6. Small staged production percentage.
7. Gradual expansion after metrics remain healthy.

### 26.2 Release monitoring

For the first 24 to 72 hours, actively watch:

- Crash-free sessions.
- Sign-in errors.
- Booking conflicts.
- Payment mismatch/refund queue.
- Video-token denial and connection errors.
- Push failures.
- API latency and 5xx errors.
- Store reviews and support contacts.

Define an owner and escalation path before release.

### 26.3 Rollback

Rollback options:

- Stop phased store rollout.
- Roll back a compatible EAS Update.
- Disable a feature with a server-side flag.
- Keep old API versions operational.
- Revert backend deployment only when database compatibility is preserved.
- Publish an urgent store build for native failures.

Payment, auth, and booking feature flags must fail closed, not expose insecure
fallbacks.

## 27. Implementation milestones

### Milestone M0: Decisions and accounts

- [ ] Confirm mobile app name and ownership.
- [ ] Confirm patient-first release sequencing.
- [ ] Confirm supported countries and languages.
- [ ] Resolve refund policy.
- [ ] Resolve account deletion and medical-data retention policy.
- [ ] Decide social-login scope.
- [ ] Create Apple, Google, Expo/EAS, Firebase/APNs, and staging service setup.
- [ ] Confirm supported Android/iOS versions.

Exit condition: Product, legal, and account prerequisites are unblocked.

### Milestone M1: Backend mobile readiness

- [ ] Add Better Auth Expo integration.
- [ ] Define `/api/v1` DTO and error conventions.
- [ ] Add shared contract tests.
- [ ] Add structured intake and auditable consent.
- [ ] Add server-side triage recheck.
- [ ] Add idempotency.
- [ ] Add missing patient read APIs.
- [ ] Add missing doctor read APIs.
- [ ] Fix doctor report authorization.
- [ ] Add payment status recovery.
- [ ] Implement refund behavior.
- [ ] Add push-device and preference APIs.
- [ ] Add account-deletion request flow.
- [ ] Add app bootstrap/version config.

Exit condition: A non-UI API client can complete patient and doctor flows
against staging.

### Milestone M2: Mobile foundation

- [ ] Create Expo project.
- [ ] Configure development, preview, and production builds.
- [ ] Configure routing and role guards.
- [ ] Configure Better Auth and SecureStore.
- [ ] Build typed API client.
- [ ] Establish design tokens and core components.
- [ ] Add error monitoring and privacy filters.
- [ ] Establish test harness.

Exit condition: Authenticated patient and doctor shells run on Android and iOS.

### Milestone M3: Patient core

- [ ] Patient home.
- [ ] Medical profile.
- [ ] Booking intake, consent, triage warning, and report upload.
- [ ] Slot picker.
- [ ] Appointment creation and recovery.
- [ ] Razorpay native checkout.
- [ ] Appointments, cancellation, and rescheduling.
- [ ] Prescriptions and receipt.
- [ ] Account settings and deletion request.

Exit condition: Patient journey works except video and push.

### Milestone M4: Native video

- [ ] LiveKit plugins and development builds.
- [ ] Camera/mic permissions.
- [ ] Pre-join screen.
- [ ] Call UI and audio routing.
- [ ] Reconnection and interruption handling.
- [ ] Cross-platform/device test matrix.

Exit condition: Patient and doctor can complete a real two-device call.

### Milestone M5: Notifications

- [ ] APNs/FCM/Expo push configuration.
- [ ] Device registration.
- [ ] Notification preferences.
- [ ] Confirmation, reminder, reschedule, cancellation, and prescription push.
- [ ] Privacy-safe payloads.
- [ ] Deep links.
- [ ] Delivery tracking and retry.

Exit condition: Transactional notifications are reliable and observable.

### Milestone M6: Doctor workflow

- [ ] Doctor home.
- [ ] Appointment list/search/filter.
- [ ] Encounter and reports.
- [ ] SOAP autosave/recovery.
- [ ] Prescription draft and issue.
- [ ] Outcome actions.
- [ ] Patients/history.
- [ ] Availability/profile/settings.

Exit condition: Doctor can run a clinic session from mobile.

### Milestone M7: Hardening and beta

- [ ] Automated native E2E journeys.
- [ ] Accessibility pass.
- [ ] Security/privacy review.
- [ ] Performance pass.
- [ ] Poor-network testing.
- [ ] Payment/refund reconciliation test.
- [ ] TestFlight and Play internal/closed beta.
- [ ] Store metadata and review accounts.

Exit condition: Release candidate approved.

### Milestone M8: Production release

- [ ] Production backend and migrations deployed.
- [ ] Production provider credentials verified.
- [ ] Store submissions approved.
- [ ] Manual/phased release started.
- [ ] Monitoring and support rotation active.
- [ ] Post-release review completed.

Exit condition: Android and iOS applications are publicly available and the
critical metrics are healthy.

## 28. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Existing API shapes change with web code | Published app breaks | Versioned DTOs, additive changes, contract tests |
| Duplicate mobile mutation after timeout | Duplicate booking/action | Server idempotency keys |
| Payment captured after hold expiry | Financial/support incident | Automatic refund or alerted operational queue |
| App killed during Razorpay checkout | User sees uncertain state | Webhook authority, status polling, recovery screen |
| Consent is not auditable | Legal/compliance exposure | Store consent version, source, and timestamp server-side |
| Triage only runs on client | Inconsistent safety behavior | Repeat deterministic check server-side |
| Doctor cannot download patient report | Broken encounter | Participant-aware report authorization |
| Push contains medical detail | Lock-screen privacy leak | Generic payload policy and tests |
| Session stored insecurely | Account compromise | Better Auth Expo + SecureStore |
| Sensitive data enters Sentry/analytics | Privacy incident | Scrubbing, allowlisted events, no bodies |
| LiveKit/Razorpay incompatible with Expo SDK | Build delay | Compatibility spike before version lock |
| Expo Go assumed usable | Video/payment development blocked | Use development builds from day one |
| Doctor note lost on poor network | Clinical workflow failure | Explicit save state and approved draft recovery |
| Old app incompatible with new backend | Production outage | API version support and minimum-version policy |
| Store rejects account deletion/login/payment flow | Release delay | Compliance checklist and review script before submission |
| Postgres report storage grows rapidly | Cost/performance issue | Monitor and migrate to object storage |
| Single reminder timestamp hides channel failure | Missed reminder | Per-channel delivery records |

## 29. Decision register

| Decision | Status | Date | Notes |
|---|---|---|---|
| Build one Android/iOS codebase with Expo and React Native | Decided | 2026-06-13 | Produces independent store binaries |
| Keep existing Next.js app as backend and web client | Decided | 2026-06-13 | No second backend/database |
| Support patient and doctor roles in one mobile application | Decided | 2026-06-13 | Server role remains authoritative |
| Use LiveKit native SDK | Decided | 2026-06-13 | Requires development builds |
| Use Razorpay native SDK | Decided | 2026-06-13 | Server verification/webhook remain authoritative |
| Use Better Auth Expo integration and SecureStore | Decided | 2026-06-13 | Existing accounts shared with web |
| Create versioned `/api/v1` contracts | Proposed | 2026-06-13 | Required for safe independent releases |
| Release patient capability before doctor capability | Proposed | 2026-06-13 | Same app; staged enablement |
| Use Expo push service initially | Proposed | 2026-06-13 | APNs/FCM credentials still required |
| Keep social login out of initial mobile v1 | Proposed | 2026-06-13 | Revisit with Sign in with Apple |
| Use EAS Build, Submit, and compatible OTA updates | Decided | 2026-06-13 | Store approval still manual |

## 30. Open decisions

Product:

- [ ] Is doctor functionality required in the first public store release, or
  may it follow the patient release?
- [ ] Which countries and currencies are supported at launch?
- [ ] Are minors allowed? If yes, define guardian consent and accounts.
- [ ] Is tablet layout required for v1?
- [ ] Is dark mode required for v1?
- [ ] What is the final refund/cancellation policy?
- [ ] Do emergency red flags block booking or require acknowledgement?

Authentication:

- [ ] OTP only, OTP plus password, or social login at launch?
- [ ] If Google login is offered on iOS, when will Sign in with Apple be added?
- [ ] Is biometric app locking required?

Clinical and legal:

- [ ] Final telemedicine consent text and versioning process.
- [ ] Medical and prescription retention periods.
- [ ] Account deletion versus anonymization matrix.
- [ ] Doctor credential information shown to patients.
- [ ] Approved emergency contact wording by region.

Technical:

- [ ] Final Expo SDK and native package versions.
- [ ] Native receipt versus server-generated downloadable receipt.
- [ ] Encrypted doctor draft persistence approach.
- [ ] Object storage timing for medical reports.
- [ ] Support/admin tool approach.
- [ ] Minimum iOS and Android versions.
- [ ] Whether production and staging use separate LiveKit projects.

Operations:

- [ ] Support response owner and hours.
- [ ] Refund reconciliation owner.
- [ ] Incident response and security contact.
- [ ] Release approval owner.

## 31. Production launch checklist

### Product

- [ ] Patient flow complete.
- [ ] Doctor flow complete or deliberately feature-gated.
- [ ] Empty, loading, offline, and error states reviewed.
- [ ] Cancellation/refund wording matches actual behavior.
- [ ] Emergency messaging approved.

### Backend

- [ ] Versioned APIs deployed.
- [ ] Auth and ownership tests pass.
- [ ] Idempotency tests pass.
- [ ] Consent is persisted.
- [ ] Server triage check active.
- [ ] Refund automation/queue active.
- [ ] Doctor report access fixed.
- [ ] Reminder delivery tracked by channel.
- [ ] Minimum-version configuration tested.

### Mobile

- [ ] Android production build installed and tested.
- [ ] iOS production build installed and tested.
- [ ] Session secure storage verified.
- [ ] Deep links and universal/app links verified.
- [ ] Camera/microphone permission flows verified.
- [ ] Push permission and deep links verified.
- [ ] Razorpay production-mode smoke test completed safely.
- [ ] LiveKit cross-device production smoke test completed.
- [ ] Logout clears sensitive caches.

### Security and privacy

- [ ] No secrets in binary or repository.
- [ ] Sentry and logs scrubbed.
- [ ] Push payloads contain no medical data.
- [ ] Privacy policy and terms published.
- [ ] Account deletion works in app and on web.
- [ ] Retention policy legally reviewed.
- [ ] Apple privacy and Google Data Safety declarations reviewed against SDKs.

### Stores

- [ ] Apple Developer and Google Play accounts active.
- [ ] App records and signing configured.
- [ ] Icons, screenshots, descriptions, and URLs complete.
- [ ] Review accounts work without internal log access.
- [ ] Review notes explain payment and medical-service behavior.
- [ ] TestFlight and Play beta feedback resolved.
- [ ] Release is manual or phased.

### Operations

- [ ] Dashboards and alerts active.
- [ ] Support owner available.
- [ ] Refund reconciliation process tested.
- [ ] Rollback steps documented and rehearsed.
- [ ] Current web application remains functional.

## 32. Definition of done

The mobile project is not "done" when both binaries compile. Mobile v1 is done
only when:

- Both applications are approved and released.
- The complete patient journey works in production.
- The approved doctor scope works in production.
- Payment recovery and refunds are operational.
- Real-device video tests pass.
- Push and email delivery are observable.
- Security, privacy, retention, and account deletion are reviewed.
- Monitoring and support ownership exist.
- Backend compatibility policy is active.
- Documentation and tracker reflect the released state.

## 33. Official references

These are starting references. Recheck them at each implementation and store
submission milestone because SDK and store requirements change.

- Expo EAS Build:
  https://docs.expo.dev/build/introduction/
- Expo EAS Submit:
  https://docs.expo.dev/submit/introduction/
- Better Auth Expo integration:
  https://better-auth.com/docs/integrations/expo
- LiveKit Expo quickstart:
  https://docs.livekit.io/transport/sdk-platforms/expo/
- LiveKit connection model:
  https://docs.livekit.io/intro/basics/connect/
- Razorpay React Native Standard SDK:
  https://razorpay.com/docs/payments/payment-gateway/react-native-integration/standard/
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Google Play account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111

Internal references:

- `docs/PRD.md`
- `docs/AppFlow.md`
- `docs/TechSpec.md`
- `docs/Design.md`
- `docs/Schema.md`
- `docs/Rules.md`
- `docs/Deployment.md`
- `docs/Tracker.md`
- `src/db/schema.ts`
- `src/lib/auth.ts`
- `src/lib/booking.ts`
- `src/lib/availability.ts`
- `src/lib/payments.ts`
- `src/lib/video.ts`
- `src/lib/consult.ts`
