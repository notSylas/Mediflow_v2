# MediFlow v2 — Folder Structure

Crystal-clear map of what lives where. The rule of thumb: **pages** under `src/app`, **logic** under `src/lib`, **UI pieces** under `src/components`, one folder per concern.

```
mediflow-v2/
├── AGENTS.md                  # AI/contributor onboarding (CLAUDE.md points here)
├── docs/                      # The docs suite (PRD, TechSpec, Tracker, …)
├── drizzle.config.ts          # Drizzle Kit config (schema path, dialect)
├── playwright.config.ts       # E2E config: global setup, serial workers, prod-build webServer
├── e2e/                       # Playwright specs (run against a real local DB)
│   ├── global-setup.ts        #   truncates ALL tables before each run
│   ├── helpers.ts             #   shared steps: OTP sign-in, doctor setup, booking
│   ├── auth.spec.ts           #   login/logout/redirects
│   ├── booking.spec.ts        #   book → pay (mock) → cancel
│   └── consult.spec.ts        #   full clinic loop incl. returning-patient history
└── src/
    ├── db/
    │   ├── schema.ts          # ALL tables (auth + domain) — single source of truth
    │   └── index.ts           # Drizzle client (postgres-js)
    ├── lib/                   # Logic layer — most files have a .test.ts sibling
    │   ├── auth.ts            # Better Auth server config (OTP, Google, roles)
    │   ├── auth-client.ts     # Better Auth React client
    │   ├── api-auth.ts        # requireSession / requireDoctorSession guards
    │   ├── availability.ts    # rules+overrides+appointments → free slots
    │   ├── slots.ts           # pure slot math (timezone-aware)
    │   ├── booking.ts         # visit reasons, hold/cancellation constants & rules
    │   ├── appointments.ts    # appointment queries (patient/doctor/participant scoped)
    │   ├── consult.ts         # encounter data, SOAP, prescriptions, patient history
    │   ├── medicines.ts       # PURE medicine display helpers (client-safe)
    │   ├── payments.ts        # provider switch, Razorpay orders, signature verification
    │   ├── razorpay-checkout.ts # client-side Checkout loader/opener
    │   ├── video.ts           # LiveKit token minting (server-only)
    │   ├── call-window.ts     # PURE join-window rules (client-safe)
    │   ├── reports.ts         # upload constraints for medical reports
    │   ├── doctor.ts          # doctor profile get/create
    │   ├── logger.ts          # pino
    │   └── utils.ts           # cn() etc.
    ├── components/
    │   ├── ui/                # shadcn/ui primitives — add via CLI, don't hand-edit style
    │   ├── AppHeader.tsx      # top nav (role-based links)
    │   ├── JoinCallButton.tsx # window-aware join button (shared by both roles)
    │   ├── LogoutButton.tsx
    │   ├── auth/LoginForm.tsx # email OTP two-step form
    │   ├── doctor/            # doctor-only client components
    │   │   ├── ProfileForm.tsx
    │   │   ├── AvailabilityRulesEditor.tsx
    │   │   ├── OverridesEditor.tsx
    │   │   ├── SoapEditor.tsx
    │   │   ├── PrescriptionComposer.tsx
    │   │   └── OutcomeButtons.tsx
    │   └── patient/
    │       ├── AppointmentCard.tsx
    │       └── booking/       # the 4-step flow: BookingFlow + one file per step
    └── app/                   # Routes only — thin pages that call src/lib
        ├── layout.tsx, page.tsx, globals.css
        ├── (auth)/login/      # guest-only route group
        ├── (app)/             # authenticated route group (header chrome)
        │   ├── patient/       # home · book · appointments[/id] · prescriptions
        │   └── doctor/        # profile+availability · appointments · encounter/[id]
        ├── call/[id]/         # full-screen video room (outside app chrome)
        └── api/               # REST-ish route handlers, mirror the URL structure
            ├── auth/[...all]/         # Better Auth
            ├── slots/                 # free-slot query
            ├── reports/[id]/          # upload/download medical reports
            ├── appointments/          # create (hold) + list
            │   └── [id]/              # get · cancel · payment(+verify) · status
            │       ├── video-token/   # gated LiveKit token
            │       ├── consult-note/  # SOAP upsert
            │       └── prescription/  # draft upsert + issue/
            ├── doctor/                # profile · availability rules/overrides CRUD
            └── webhooks/razorpay/     # signature-verified payment confirmation
```

## Conventions that keep it tidy

1. **Pages don't query the DB directly** — they call `src/lib/*` functions. API routes validate (Zod) → authorize → call the same lib functions.
2. **Client-safe vs server-only**: anything importing `db`, `livekit-server-sdk`, or `node:crypto` is server-only. Pure logic that client components need lives in its own file (`medicines.ts`, `call-window.ts`, `booking.ts`). The build fails loudly if this is violated.
3. **Tests sit next to code** (`*.test.ts` in `src/lib`) for unit logic; user journeys live in `e2e/`.
4. **One component per file**, folder by audience (`doctor/`, `patient/`, shared at root).
5. Route groups `(auth)`/`(app)` carry layout/guard differences; `call/` sits outside `(app)` deliberately — video wants the full screen, no header.
