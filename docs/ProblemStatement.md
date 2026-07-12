# MediFlow — Problem Statement

## Background — the real situation

One doctor runs a physical clinic. To see patients, they travel roughly
**2 hours** to reach the clinic, sees patients for about **2 hours**, then
travels back. So a single clinic session costs the doctor half a day, most
of it spent commuting rather than treating patients.

## The Core Problem

Patients book appointments, but nothing stops them from simply not showing
up. There's no cost to them for skipping — no payment made, no commitment
given. When a patient no-shows, the doctor has already made the full trip,
cleared the time, and shown up — for nothing. The slot is gone, it can't be
recovered or resold on short notice, and the doctor's entire half-day
investment (travel + wait + clinic time) is wasted for that one missed
patient.

This is the actual, quantifiable damage: **the doctor's scarce, expensive
time (2 hours of travel to earn 2 hours of consulting) can be erased by a
single patient's decision not to show up — a decision that currently costs
the patient nothing.**

## Why this is deeper than "just build a booking calendar"

A generic booking calendar doesn't fix this — it just digitizes the same
broken incentive: patients can still book freely and skip freely. The
actual root cause isn't *scheduling*, it's **misaligned commitment** —
booking a slot and being invested in that slot are two different things,
and nothing in a typical system ties them together.

Once you try to fix that one root cause — by making the patient pay
*before* the slot is confirmed — a chain of new problems surfaces that have
to be solved too, or the fix is incomplete:

1. **If a patient is now paying real money upfront, the consultation itself
   has to actually happen smoothly** — you can't take someone's money and
   then hand them a broken Zoom link or a confusing "join the call"
   process. The video experience has to be dead simple, built in, and
   reliable.
2. **If the doctor is now running these consults from home instead of a
   clinic with paper files, patient records can't live in someone's memory
   or a notebook anymore** — every consult needs a proper digital note and
   prescription, and past history needs to be retrievable instantly,
   especially for returning patients.
3. **If patients are paying per-visit, but many concerns don't need a full
   paid video consult** (a quick follow-up question, "is this rash
   normal", a refill) — forcing every single interaction through a full
   paid booking creates *friction in the other direction*: patients avoid
   reaching out even when they should, and the doctor loses the
   low-effort, high-trust touchpoints that keep a patient coming back.
4. **All of this only works if it's trustworthy** — a doctor handling real
   health data and real money can't have a system with sloppy consent
   handling, no record of who-said-what, or payment flows that can
   silently fail.

## The Problem Statement, stated fully

> A single-doctor clinic loses irrecoverable time and income to patient
> no-shows, because there is no cost or commitment attached to booking a
> slot. Fixing this by requiring payment at booking is necessary but not
> sufficient on its own — it only works if the resulting online
> consultation is frictionless (real video, not a workaround), the medical
> record-keeping is solid enough to replace an in-person clinic's paper
> trail, and patients have a lower-friction way to stay in touch between
> paid visits so they don't disengage entirely. Solve only the payment
> piece, and you've digitized the clinic without fixing the doctor's actual
> problem. Solve all four, and the doctor gets their scarce, expensive time
> back — protected, not just scheduled.

## How the solution maps back, piece by piece

| Root cause | What had to be built |
|---|---|
| No commitment when booking | Pay-at-booking, enforced by a real payment gateway with signature verification — not just a calendar hold |
| Consult has to justify the payment | Built-in video calling, so the paid slot reliably converts into an actual consultation |
| Doctor now practices from home, not a clinic with files | Structured digital notes (SOAP) + prescriptions + full patient history, replacing the paper trail entirely |
| Per-visit payment creates friction for small follow-ups | A subscription (MediFlow Care) that unlocks messaging and refills without a new paid booking each time |
| Real money + real health data demands trust | Enforced consent, server-side safety checks (emergency triage), and irreversible-action confirmations throughout |

This is the shape of the problem — and notably, the parts still incomplete
(refund policy on regular cancellations, no waitlist, mock subscription
billing) are gaps in the *edges* of this problem, not the core: the
central bet — pay-at-booking to protect the doctor's time — is the one
that's fully built and working.
