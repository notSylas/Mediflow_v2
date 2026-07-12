# MediFlow v1 — pages, components & flows

Companion to [v1-feature-inventory.md](./v1-feature-inventory.md) (which covers backend functionality). This one maps the v1 frontend: every page on each side, the component inventory, the booking flow step by step, and exactly what data is collected where. Swept from `~/Projects/MediFlow/frontend/src` on 2026-06-12.

Tags: **[M1–M5]** v2 milestone · **[v1.5]** post-launch · **[cut]** not rebuilding · **[decide]** undecided.

---

## 1. Patient-side pages

Sidebar nav order in v1: Home, Book Visit, Appointments, Messages, Health Records, Prescriptions, Medications, Timeline, Care Plan (+ Profile, Settings, FAQ reachable from the profile menu).

| Route | Page | What it does | v2 |
|---|---|---|---|
| `/patient/home` | PatientDashboard | Widget grid: vitals, medications, recent reports, messages | [M3] slim: next appointment + book CTA + recent consults |
| `/patient/report` | BookingIntake | Booking step 1 — see §5 | [M3] |
| `/patient/appointments` | TimeSlotSelection | Booking step 2 — see §5 | [M2/M3] |
| `/patient/payment` | BookingPayment | Booking step 3 — see §5 | [M3] |
| `/patient/confirmation` | BookingConfirmation | Booking step 4 — see §5 | [M3] |
| `/patient/my-appointments` | AppointmentsList | Upcoming/past appointments, status badges | [M3] |
| `/patient/appointments/:id` | AppointmentDetail | One appointment: status, join-call button, attached report | [M3/M4] |
| `/patient/prescriptions` (+`/:id`) | PrescriptionsList / PrescriptionDetail | Issued prescriptions, rendered detail | [M4] |
| `/patient/profile` | PatientProfile | The long medical-profile form (see inventory §2) | [M3] slim |
| `/patient/messaging` | MessagingLounge | Chat with the doctor | [cut] |
| `/patient/records` | HealthHub | Health overview hub | [cut] |
| `/patient/records/vault` | MedicalRecordsVault | All uploaded files | [decide] — report uploads exist in M3; a "my files" list is cheap |
| `/patient/timeline` | MedicalTimeline | Chronological care history | [cut] |
| `/patient/medications` | MedicationTracker | Daily med schedule from active prescriptions | [decide] |
| `/patient/diet` | DietPlan ("Care Plan") | Diet/lifestyle page | [cut] |
| `/patient/faq` | FAQPage | Static FAQ | [M5] cheap static page |
| `/patient/settings` | PatientSettings | Account settings | [M5] |

## 2. Doctor-side pages

Sidebar nav order: Dashboard, Appointments, Schedule, Patients, Prescriptions, Messages, Billing.

| Route | Page | What it does | v2 |
|---|---|---|---|
| `/doctor/dashboard` | DoctorDashboard | Widget grid: today's schedule, next patient, waiting room, recent patients, clinical tasks, revenue, stats, scratchpad | [M4] slim: today's list + join + pending notes |
| `/doctor/appointments` | AppointmentsManager | All appointments, filter by status/day | [M4] |
| `/doctor/schedule` | ScheduleManager | Weekly availability editor — see §6 | [M2] |
| `/doctor/patients` | DoctorPatientsPanel | Patient roster + PatientHistoryModal drill-in | [M4] |
| `/doctor/prescriptions` | PrescriptionsDashboard | All prescriptions, status filters | [M4] |
| `/doctor/prescriptions/new`, `/:id/edit` | WritePrescription | Structured prescription editor (inventory §5) | [M4] |
| `/doctor/encounter/:id` | ClinicalEncounter | In-consult workspace — see §7 | [M4] |
| `/doctor/billing` | RevenueDashboard | Earnings charts | [cut] |
| `/doctor/messaging` | MessagingLounge | Chat (shared component with patient side) | [cut] |
| `/doctor/profile` | DoctorProfile (+ ProfileCompletion meter) | Credentials, clinic branding | [M2] slim |
| `/doctor/settings` | DoctorSettings | Account settings | [M5] |

## 3. Shared / standalone pages

| Route | Page | v2 |
|---|---|---|
| `/` | LandingPage (RootRedirect sends logged-in users to their portal) | [M5] simple landing for the doctor's clinic |
| `/auth/login`, `/auth/register` | LoginPage / RegisterPage inside AuthLayout | [M1] rebuilt as OTP/Google |
| `/call/:id` | VideoCallRoom (telemedicine feature, role-agnostic) | [M4] LiveKit room |
| `*` | NotFoundPage | [M5] |

## 4. Component inventory

- **Layouts:** `PatientLayout`, `DoctorLayout` — sidebar + topbar shells, route-aware titles, mobile nav. `AuthLayout` for login/register. → v2 needs the same two portal shells [M2/M3].
- **Booking:** `BookingStepper` (4-step progress: Upload/Report → Select Slot → Payment → Confirmation), `PaymentMethodSelector` (UPI/card cards), `PaymentSummary`. → keep the stepper pattern [M3]; method selection moves inside Razorpay Checkout.
- **Video:** `VideoJoinButton` (gated by appointment time), `VideoPreCheck` (camera/mic test before joining). → both patterns worth rebuilding on LiveKit [M4]; pre-check especially — patients are non-technical.
- **Doctor:** `PatientHistoryModal` (quick patient context from roster/encounter), `ProfileCompletion` meter. → modal [M4]; meter [cut].
- **Widgets (12):** TodaySchedule, NextPatient, WaitingRoom, RecentPatients, ClinicalTasks, Revenue, DoctorStats, Scratchpad, Vitals, Medications, RecentReports, Messages. → only TodaySchedule + NextPatient concepts survive into v2's slim dashboards [M3/M4]; rest [cut]/[decide].
- **Chat (6):** full suite under `components/chat/` with `useChatInterface` hook. → [cut].
- **UI primitives:** shadcn-style set — avatar, badge, button, card, dialog, dropdown-menu, input, label, select, skeleton, tabs, textarea, plus custom `smart-textarea`, `tag-input`. → v2 equivalent: shadcn/ui [M2].
- **Shared plumbing:** ErrorBoundary, GuestRoute, PageLoader, PageTransition (animated route exits), RootRedirect. → v2 gets these mostly free from Next.js (route groups, `loading.tsx`, `error.tsx`, middleware).

## 5. The booking flow (v1's most designed path)

Four steps with a persistent `BookingStepper` across the top.

**Step 1 — Intake (`/patient/report`, BookingIntake)** — data collected:
- Visit reason (pick one card): `new-symptoms`, `follow-up`, `prescription-refill`, `lab-review`, `general-consultation` — each with helper text. Choice "tailors the rest of the flow."
- Symptoms (free-text textarea: "describe the issue, how long, anything the doctor should know").
- Optional file upload — drag & drop, pdf/jpg/png, immediately `POST /api/patients/reports/` (so the file exists before the appointment does).
- Doctor selection (`GET /api/doctors/` — multi-doctor UI even though there was one doctor).

**Step 2 — Slot (`/patient/appointments`, TimeSlotSelection):** date picker → `GET /api/doctors/{id}/slots/?date=` → pick a time chip.

**Step 3 — Payment (`/patient/payment`, BookingPayment):** method selector (UPI default / card), summary panel, then `POST /api/billing/pay/` (mock) followed by `POST /api/appointments/` carrying `payment_id` + symptoms + report id + slot.

**Step 4 — Confirmation (`/patient/confirmation`):** success screen reading the just-confirmed booking.

**How state moved between steps (v1's biggest weakness):** intake → slot via URL query params (`doctorId`, `reportId`, `reportName`, `symptoms`, `visitReason`…); slot → payment via `sessionStorage["opd_booking_data"]`; confirmed booking written to `sessionStorage["last_confirmed_booking"]` and mirrored into `localStorage["opd_appointments"]`. Consequences: refresh-fragile, tamperable, and — critically — the slot is not reserved until after "payment", so two patients could pay for the same slot.

**v2 redesign of the same flow [M3]:** keep the 4-step UX (it's good), but the moment a slot is picked the server creates the `pending_payment` appointment row (the 10-minute hold) — all state lives in that row from then on. Step 3 becomes a real Razorpay order on that appointment; the webhook confirms it. Refresh-safe, race-safe via the DB unique index, nothing client-held.

## 6. Doctor schedule editor (worth copying)

v1's `ScheduleManager` is a drag-to-paint weekly grid: day columns × time-slot cells, click-drag to fill or clear ranges, a calendar popover for blocked dates, unsaved-changes tracking, saved as `{schedule: {day: [times]}, blocked_dates: []}` JSON. The interaction is genuinely good for a non-technical doctor — rebuild the same UX in v2's availability editor [M2], but persist to the proper `availability_rules`/`availability_overrides` tables instead of a JSON blob.

## 7. Clinical encounter page (worth copying)

`ClinicalEncounter` is a SOAP-structured note editor — four sections (Subjective: patient's description / Objective: clinical observations & vitals / Assessment: diagnosis / Plan: treatment & next steps) with section navigation, loading the appointment context (symptoms, attached report) alongside. PATCHes back to the appointment. → v2's consult page [M4] should keep the SOAP structure — it also defines the exact output format for the v1.5 AI scribe (transcript → draft SOAP).

## 8. Data collected, in one place

| Where | Fields |
|---|---|
| Registration | first name, last name, email (used as username), password + confirm (strength meter, zod), terms checkbox. → v2: name + email + OTP, role fixed to patient [M1] |
| Booking intake | visit reason (1 of 5), symptoms text, optional report file (pdf/jpg/png) | 
| Patient profile | gender, DOB, blood group, height, weight, allergies, chronic conditions, past surgeries, family history, emergency contact (name/number/relationship), insurance (provider/policy), address, subscription flags — see inventory §2 for v2 slimming |
| Doctor schedule | weekly grid (day → time slots) + blocked dates |
| Consult (SOAP) | subjective, objective, assessment, plan — free text each |
| Prescription | diagnosis, notes, validity, per-medicine structured rows (inventory §5) |
| Payment | method choice only (mock — no real payment data ever collected) |
