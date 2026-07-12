# MediFlow — Design Brief

This is a **fresh visual take** — there is no existing design system to
follow or match. Ignore anything about the current app's look and feel;
this brief covers the product, the users, and the screens that need
designs, not an existing style. You have full creative freedom on
typography, color, layout, and visual identity.

## The Problem

A single doctor runs a physical clinic. Getting there and back costs about
4 hours of travel for roughly 2 hours of actual patient consulting. If a
patient books a slot and doesn't show up, that entire trip — half a day —
is wasted, because nothing currently ties a booking to any real commitment
from the patient.

## The Solution

An online clinic for that one doctor:

- Patients **pay at the time of booking** (not after) — this is the core
  fix for no-shows, since a paid slot is a real commitment.
- Patient and doctor meet over **video, inside the app** — no external
  links or separate apps.
- The doctor writes a structured note and prescription during the call,
  which the patient can retrieve any time afterward.
- Patients can also subscribe to an ongoing plan that unlocks messaging
  the doctor directly for quick questions, without booking a new paid
  visit each time.

## Who uses this

| User | Description | What they need most |
|---|---|---|
| **Patient** | Non-technical, often on a phone, sometimes anxious about a health issue | One obvious action per screen. Fast booking, a call that "just works," and easy access to their prescription afterward. |
| **Doctor** | A single doctor, moderately technical, always short on time | Dense, fast, scannable screens — they need to get through several consultations back-to-back without friction. |

**Design implication:** patient-facing screens should feel calm, guided,
and reassuring (this is health data and real payment — trust matters more
than flash). Doctor-facing screens can be denser and more utilitarian,
built for speed rather than delight.

## Full screen inventory

Design for both a web (browser) experience and a mobile app experience.
Below is everything that needs a screen — treat this as the checklist.

### Tier 1 — critical path (design these first)

**Patient**
- Sign in (email one-time-code, no password)
- Book an appointment (multi-step: reason for visit → pick a time slot →
  pay → confirmation)
- Appointment detail page (shows join button, becomes active 10 minutes
  before the slot)
- Video call screen (with a camera/mic check before joining)
- Prescription view (medicines, dosage/schedule, advice) after the call

**Doctor**
- Today's appointments list
- The consultation screen itself — needs to show: patient's stated reason
  for visiting, a note-taking area, a prescription builder, and — if it's
  a returning patient — their past visit history, all on one screen
  without much scrolling
- Mark a consult as completed / patient no-show

### Tier 2 — supporting flows

**Patient**
- My appointments (list, with cancel option)
- My prescriptions (list of all past ones)
- Payment receipt
- My profile / account settings
- Subscribe to the ongoing-care plan + its checkout screen
- Cancel the ongoing-care plan

**Doctor**
- Patient list / roster
- Individual patient record (full history: past visits, prescriptions,
  medicines)
- Weekly availability + date overrides (blocking a holiday, adding an
  extra session)
- Doctor's own settings/profile
- A "work queue" — a to-do view surfacing things needing attention
  (unread messages, refill requests, recommended follow-ups)
- Medicine refill requests list
- Manage subscribers to the ongoing-care plan

**Shared**
- Messaging / chat (between a subscribed patient and the doctor)

### Tier 3 — low-frequency / utility

- Terms & Conditions
- Privacy Policy
- "Page not found"
- App landing/home page (pre-login)

## Key flows to understand (not just isolated screens)

**Booking flow (patient):**
Sign in → say why you're visiting (+ optional symptom description and
report upload) → pick a date and free time slot → pay → confirmation.
The slot is held for 10 minutes during payment — if payment isn't
completed in time, the hold expires and the slot becomes free again.

**Consultation day (patient):**
The "join" button on the appointment only becomes active 10 minutes before
the scheduled time. Joining goes through a quick camera/mic check first,
then into the call. Afterward, the prescription and visit notes appear
automatically on that same appointment.

**Clinic day (doctor):**
The doctor works through a list of today's appointments one at a time.
Opening one shows everything needed for that consult on one screen — no
digging through multiple pages mid-consultation. After the call, they
write the note, issue the prescription (this locks it — it can't be
edited afterward, so the design should make "issuing" feel like a
deliberate, final action), and mark the outcome before moving to the next
patient.

**Ongoing care (patient):**
Outside of a full paid visit, a subscribed patient can message the doctor
directly or request a prescription refill — these are lighter-weight
interactions than a full video consult and should feel that way.

## Practical constraints for the designer

These are functional/content rules, not style choices — they affect what
needs to be *shown*, regardless of how it looks:

- All money is in Indian Rupees (₹), always shown with two decimal places.
- Every appointment time is shown in the doctor's local timezone, with a
  human date format (e.g. "Friday, Jun 12, 6:20 pm"), not raw timestamps.
- Status labels must always be human-readable words (e.g. "Awaiting
  payment", "Confirmed", "Missed"), never raw codes.
- Every irreversible action (issuing a prescription, cancelling an
  appointment) needs some kind of confirmation step — these mistakes can't
  be undone afterward.
- Empty states (no appointments yet, no prescriptions yet) need a short
  explanatory sentence plus a next action, not just a blank screen.

## What's out of scope

Not part of this design pass: a multi-doctor/marketplace experience,
insurance billing, or a full medical-records vault. Design for a single
doctor's practice only.
