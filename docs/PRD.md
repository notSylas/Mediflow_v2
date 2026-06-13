# MediFlow v2 — Product Requirements

## Problem

A doctor runs a physical clinic that requires ~2 hours of travel for ~2 hours of consulting, with no guarantee that patients show up. Empty slots cost the doctor half a day.

## Solution

An online clinic for that doctor. Patients book a **paid** slot (payment at booking is the no-show fix), meet the doctor on a video call inside the app, and receive a structured prescription they can always retrieve. The doctor manages availability, runs consultations, and keeps full per-patient history — all from home.

## Users

| User | Description | Primary goals |
|---|---|---|
| Patient | Non-technical, often on mobile | Book quickly, join the call without friction, see their prescription |
| Doctor | Single doctor (v1), moderately technical | Fill slots with committed patients, consult efficiently, write prescriptions, see patient history |

## Core user stories (v1)

**Patient**
1. Sign in with email OTP (no passwords).
2. Tell the doctor why I'm coming (visit reason + symptoms + optional report upload).
3. Pick a free slot and pay the consultation fee at booking.
4. Join the video consultation from my appointment page (with camera/mic pre-check).
5. See my prescription and consultation outcome afterwards; retrieve all past prescriptions anytime.
6. Cancel within the allowed window.

**Doctor**
1. Define weekly availability and date overrides (holidays / extra sessions).
2. See today's and upcoming appointments.
3. Open an encounter: intake note, attached reports, **full history if returning patient** (past consults, prescriptions, medicine history).
4. Run the video call, write a SOAP note, compose a structured prescription, issue it (locked once issued).
5. Mark the appointment completed or no-show.

## Scope fences

- **v1**: everything above. Single doctor, but the data model keeps `doctor` an entity (multi-doctor later = data change, not rewrite).
- **v1.5**: AI scribe (transcript → draft SOAP + prescription), branded prescription PDF, email confirmations/reminders if not done in v1.
- **Cut** (decided 2026-06-12): chat/messaging, records vault, revenue dashboards, doctor discovery/signup, medication tracker, diet/timeline pages. See `docs/v1-feature-inventory.md` for the complete disposition list.

## Success criteria

- A real patient can book → pay → consult → receive prescription with zero manual intervention.
- Zero double-bookings (enforced by the database, verified by tests).
- The doctor can run a full clinic session (5+ consecutive consults) without leaving `/doctor/appointments`.

## Non-goals

Marketplace dynamics, insurance billing, EHR interoperability, native mobile apps.
