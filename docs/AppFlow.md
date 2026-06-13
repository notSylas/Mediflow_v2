x`# MediFlow v2 — Application Flows

## Appointment state machine

```
                 ┌──────────────────┐
  slot picked ──▶│ pending_payment  │── hold expires (10 min) ──▶ treated as free,
                 └────────┬─────────┘    cancelled lazily on next booking attempt
                          │ payment success (mock confirm / Razorpay webhook)
                          ▼
                 ┌──────────────────┐
                 │    confirmed     │──── patient cancels (≥2h before) ──▶ cancelled
                 └────────┬─────────┘
                          │ doctor records outcome after consult
                          ▼
                completed  │  no_show
```

Prescription: `draft → issued` (issued = locked forever).

## Patient: first visit

1. **Sign in** — email OTP (`/login`). New emails become `patient` accounts automatically.
2. **Book** (`/patient/book`, 4 steps, one client flow):
   - *Intake*: visit reason (one of 5), symptoms text, optional report upload (uploads immediately → `medical_reports`).
   - *Slot*: date → free slots (computed live) → pick one → appointment row created (`pending_payment`, 10-min hold). URL becomes `?appointment=<id>` so refresh resumes the flow.
   - *Payment*: mock = confirm button; Razorpay = Checkout popup. Success → `confirmed`.
   - *Confirmation*: summary.
3. **Before the call** (`/patient/appointments/[id]`): join button activates 10 minutes before the slot.
4. **The call** (`/call/[id]`): camera/mic pre-join check → video room. Token validated server-side (participant + time window).
5. **After**: when the doctor completes the consult and issues the prescription, the appointment page shows diagnosis, medicines with schedule ("Morning, Night · After food · 5 days"), advice. `/patient/prescriptions` lists all of them permanently.

## Patient: returning visit

Same booking flow (typically visit reason = follow-up). Nothing extra to do — history surfaces on the **doctor's** side automatically.

## Doctor: setup (once)

`/doctor` → profile (specialty, bio, fee, slot length, timezone) → weekly availability rules → date overrides (block a holiday / add an extra session).

## Doctor: clinic day

1. `/doctor/appointments` — Today / Upcoming / Past, each row → encounter.
2. **Encounter** (`/doctor/encounter/[id]`):
   - Header: patient, status, **"Returning patient" badge**, intake note, attached reports, join-call button.
   - Left: SOAP note editor; structured prescription composer → save draft → **issue** (confirm dialog; locks it).
   - Right: past consultations with this patient (notes + prescriptions) and full medicine history — the returning-patient requirement.
   - Outcome: mark completed / no-show.
3. Next patient — back to the list.

## Auth & routing

- `/` redirects by session role → `/patient` or `/doctor`; guests → `/login`.
- Patient pages require a session; doctor pages additionally require `role=doctor` (redirect to `/patient` otherwise).
- API: `requireSession` / `requireDoctorSession` + per-resource ownership checks. Patients can never read another patient's appointments, reports, or prescriptions; the doctor can only touch appointments booked with them.

## Failure paths handled

- Hold expired mid-payment → 410 → flow restarts at intake with a message.
- Two patients race for one slot → DB unique index → loser gets 409 "Slot is no longer available".
- Video not configured / outside window → friendly error page with reason.
- Issued prescription edit attempt → 409 with explanation.
