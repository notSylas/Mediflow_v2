# MediFlow v1 — feature inventory

Everything the old repo (`~/Projects/MediFlow`, Django + React) actually implements, swept from its URL configs, models, views, and frontend routes on 2026-06-12. Use this as the reference checklist for v2 so nothing gets lost silently — each item is tagged with its v2 disposition.

Tags: **[M1–M5]** planned v2 milestone · **[v1.5]** planned after launch · **[cut]** deliberately not rebuilding · **[decide]** not yet decided — revisit when we get there.

---

## 1. Auth & accounts (`apps/users`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Register (patient + doctor) | Doctor registration was "secured" later (invite-style) | [M1] done — Better Auth; no doctor self-signup in v2 |
| Login / logout / JWT refresh | SimpleJWT access+refresh tokens | [M1] done — session-based via Better Auth |
| Change password | | [cut] — v2 uses email OTP + Google, no passwords |
| Roles: `patient` / `doctor` on CustomUser | Drives routing + permissions everywhere | [M1] done — `role` field on user |

## 2. Patient profile & records (`apps/patients`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Patient profile CRUD | Rich: gender, DOB, blood group, height/weight, allergies, chronic conditions, past surgeries, family history, emergency contact, insurance, address | [M3] slim version — only what the doctor needs pre-consult (DOB, allergies, conditions). Rest [decide] |
| Medical report upload (file) | `MedicalReport`: file + name; attachable to an appointment at booking | [M3] keep — patient attaches reports during booking intake |
| Yearly subscription flag on patient | `has_yearly_subscription`, `subscription_expiry` — membership model | [decide] — pay-per-consult is v2's model; revisit if doctor wants memberships |
| Patient prescriptions list/detail view | Read-only view of issued prescriptions | [M4] keep |

## 3. Doctor profile & clinic (`apps/doctors`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Doctor public profile | Specialization, experience, fee, bio, education, certifications, awards, languages, qualifications, medical council + registration | [M2] slim: specialty, bio, fee. Credentials display [decide] |
| Clinic branding assets | Digital signature, clinic stamp, clinic logo, clinic name/address — used to render official-looking prescription PDFs | [v1.5] with prescription PDF generation |
| Weekly availability schedule | `DoctorAvailability.schedule` JSONField + `blocked_dates` JSON | [M2] rebuilt properly as `availability_rules` + `availability_overrides` tables |
| Free slot computation endpoint | `GET /doctors/{id}/slots/` (public) | [M2] the slot engine |
| Doctor's patient roster | `GET /doctors/patients/` — everyone he's consulted | [M4] simple list derived from appointments |
| Clinical tasks (to-do list) | `ClinicalTask`: title, priority, due date, status — doctor's personal task widget | [cut] — not core; any task app does this |
| Cancellation period setting | `cancellation_period_days` on profile | [M3] keep as a booking rule (how late a patient may cancel) |

## 4. Appointments & booking (`apps/appointments`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Book appointment | Patient picks slot, adds symptoms text, optionally attaches a medical report | [M3] core flow, plus payment-before-confirm (v1 had no payment gate) |
| Statuses: PENDING → CONFIRMED → COMPLETED / CANCELLED | No NO_SHOW in v1 | [M3] v2 adds `pending_payment` hold + `no_show` |
| Cancel appointment (`POST .../cancel/`) | Both roles | [M3] keep, respecting cancellation window; refund policy [decide] |
| Symptoms / intake note on booking | Free text | [M3] keep (`intake_note`) |
| Doctor appointment management UI | List, filter, per-day view | [M4] |
| Clinical encounter page (`/doctor/encounter/:id`) | The "during consult" workspace: patient history modal, write notes, issue prescription | [M4] consult page = video + notes + prescription together |

## 5. Prescriptions (`apps/doctors/prescription_*`)

The deepest feature in v1 — significantly more built-out than expected:

| v1 functionality | Notes | v2 |
|---|---|---|
| Prescription per appointment | Diagnosis, notes, status (draft/issued), validity date, lock-after-issue (`is_locked`) | [M4] keep the draft → issued → locked lifecycle — it's good clinical hygiene |
| Structured medicines (`PrescriptionMedicine`) | Per medicine: name, type, dosage, strength, route, frequency, morning/afternoon/evening/night flags, food relation, duration value+unit, dose quantity+unit | [M4] keep structured (not a text blob) — this is what makes the AI scribe [v1.5] output usable |
| Doctor prescription dashboard + write/edit pages | `/doctor/prescriptions`, `/new`, `/:id/edit` | [M4] |
| Patient prescription detail page | Rendered with clinic branding | [M4] basic; branded PDF [v1.5] |
| Medication tracker page (patient) | `/patient/medications` — daily med schedule from active prescriptions | [decide] — nice retention feature, not launch-critical |

## 6. Payments & billing (`apps/billing`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Invoice model + CRUD | Per appointment | [M3] `payments` table; invoice rendering [v1.5] |
| PaymentIntent + `POST /billing/pay/` | Mock/manual processing — no real gateway was ever wired | [M3] replaced by real Razorpay order + webhook |
| Revenue dashboard (`/doctor/billing`) | Charts of earnings | [cut] for launch — a paid-appointments list covers it; dashboard [decide] later |

## 7. Video consultation (`apps/video`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Video session per appointment | `VideoSession` created via **Google Calendar API** — service account creates a calendar event and uses its **Google Meet link** | [M4] replaced by LiveKit room; no Google dependency |
| Tokenized join flow | `GET /video/appointments/{id}/join/` issues token; `/video/session/{token}/` validates + redirects | [M4] same idea, LiveKit access tokens gated by ownership + time window |
| In-app call page (`/call/:id`) | Wrapper around the Meet link | [M4] real in-app call UI (LiveKit React components) |
| Celery task for session lifecycle | Async session creation/cleanup | [cut] — room created at booking-confirm, no worker needed |

## 8. Messaging (`apps/messaging`)

| v1 functionality | Notes | v2 |
|---|---|---|
| Doctor↔patient conversations + messages | REST + WebSocket (Django Channels consumers), ws-token auth, unread counts, mark-as-read | [cut] from v1 scope (decided 2026-06-12) — email covers async contact; revisit post-launch [decide] |
| Chat UI (sidebar, composer, message list) | Full `components/chat/` suite, used by both roles | [cut] with above |

## 9. Dashboards & widgets (frontend)

| v1 functionality | Notes | v2 |
|---|---|---|
| Doctor dashboard | Widgets: today's schedule, next patient, waiting room, recent patients, clinical tasks, revenue, stats, scratchpad, messages | [M4] minimal: today's appointments + join-call + pending notes. Rest [cut]/[decide] |
| Patient home | Widgets: vitals, medications, recent reports, messages | [M3] minimal: upcoming appointment + book button + past consults |
| Patient extras: health records vault, medical timeline, diet page, FAQ | `/patient/records/vault`, `/timeline`, `/diet`, `/faq` | [cut] — records vault partially covered by report uploads [M3]; rest out |
| Patient/doctor settings pages | | [M5] minimal (profile edit, notification prefs) |

## 10. Platform / infra features

| v1 functionality | Notes | v2 |
|---|---|---|
| Health/readiness/deep-health endpoints | `apps/common` | [M5] trivial health route |
| OpenAPI schema + Swagger/ReDoc | drf-spectacular | [decide] — less needed in a single full-stack app |
| Admin panel (Django admin) | Free with Django | [decide] — Drizzle Studio covers dev needs; doctor-facing admin is the app itself |
| Email notifications | **Not actually present in v1** — no booking confirmations or reminders | [M5] new in v2: confirmation + reminder emails (this was a real gap) |

---

## What v1 never had (gaps v2 fixes)

- No real payment gateway — booking was never gated on payment, so the no-show problem v1 was meant to solve wasn't actually solved.
- No emails/reminders of any kind.
- No protection against double-booking at the DB level.
- Video depended on a Google service account creating calendar events — fragile and admin-heavy.

## The shortlist most at risk of being forgotten

Things v1 did well that aren't in the v2 milestone names, so check them off explicitly: structured prescription medicines with timing flags (§5), prescription lock-after-issue (§5), cancellation window setting (§3), medical report attachment at booking (§2), patient allergy/condition fields surfaced to the doctor pre-consult (§2).
