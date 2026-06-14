# MediFlow UI/UX Audit and Redesign Plan

End-to-end product experience, interface design, workflow, accessibility, and
implementation reference for the MediFlow web and future mobile applications.

Last reviewed: 2026-06-13

Document status: Proposed

Implementation status: Not started

## 1. Purpose

This document is deliberately direct. It is not a compliment document and it
is not a list of decorative ideas. It records:

- what currently works;
- what currently looks or behaves weakly;
- where the workflow can confuse patients or slow down the doctor;
- what an industrial-quality version should do instead;
- the order in which improvements should be implemented;
- the acceptance criteria for judging the result.

The goal is not to make MediFlow look like a generic SaaS dashboard. The goal
is to make it feel like a trustworthy, calm, clinically responsible
consultation product that a non-technical patient can use without assistance
and a busy doctor can operate repeatedly without friction.

This document covers product and UX direction only. It does not authorize
scope expansion into chat, a medical-records vault, doctor discovery,
insurance, medication tracking, or other features already excluded from v1.

## 2. Executive verdict

### 2.1 The blunt assessment

The current product is functional and technically more mature than its visual
appearance suggests. The important backend foundations are good: paid booking,
slot holds, database-level double-booking prevention, role-based access,
LiveKit, structured prescriptions, patient history, and a real appointment
state machine.

The interface, however, currently presents much of that work as a collection
of clean cards in an administrative dashboard. It does not yet feel like a
care journey.

The patient dashboard shown in the current build is not ugly. It is tidy,
consistent, and readable. But it is generic, low-emotion, and too focused on
zero-value metrics. A first-time patient sees four statistics containing
mostly zeroes, three separate booking calls to action, a large empty
appointment card, and an incomplete doctor identity. This communicates that
the account is empty, not that the clinic is ready to help.

The current experience is approximately:

> Here is your account and its data.

The target experience should be:

> Here is what to do next, what will happen, and how we will take care of you.

### 2.2 Current maturity by area

| Area | Current assessment | Target |
|---|---|---|
| Backend workflow | Strong v1 foundation | Preserve |
| Information architecture | Mostly sensible | Simplify and prioritize |
| Patient home | Clean but dashboard-like | State-driven care hub |
| Booking | Structurally good | Improve clarity, recovery, and trust |
| Appointment detail | Functional | Make it the consultation command center |
| Video entry | Technically valid | Improve preparation and failure recovery |
| Prescriptions | Functional | Improve clinical readability and actions |
| Medical profile | Complete enough | Progressive, safer, easier to scan |
| Doctor dashboard | Useful | More operational and time-sensitive |
| Doctor encounter | Feature-rich | Better clinical hierarchy and action safety |
| Mobile navigation | Acceptable web fallback | Purpose-designed mobile pattern |
| Visual identity | Consistent but generic | Distinct, calm clinical product |
| Accessibility | Basic practices present | Formal WCAG 2.2 AA standard |
| Empty/error states | Present but minimal | Actionable and reassuring |
| Trust and safety | Partially expressed | Visible throughout critical flows |

## 3. Product experience principles

All future screens should follow these principles.

### 3.1 One dominant action per state

A patient screen can contain several links, but only one action should appear
visually dominant. The dominant action changes with the patient's state:

- no appointment: **Book a consultation**;
- payment pending: **Complete payment**;
- upcoming appointment: **View appointment**;
- consultation window open: **Join consultation**;
- consultation completed: **View prescription**;
- profile incomplete and no urgent appointment: **Complete medical profile**.

Repeating the same high-emphasis booking button in several cards does not make
the workflow clearer. It makes the hierarchy weaker.

### 3.2 Design around moments, not database entities

Patients do not think in terms of appointments, reports, prescriptions, and
profile records. They think:

1. I need medical help.
2. I need to explain the problem.
3. I need a suitable time.
4. I need to know the booking is confirmed.
5. I need to be ready for the call.
6. I need to speak to the doctor.
7. I need to understand what to do afterward.

The interface should use the underlying entities without making the patient
mentally assemble the journey.

### 3.3 Clinical trust before visual novelty

The application should feel modern but not experimental. Avoid excessive
glassmorphism, floating animations, gradients on every card, gamified health
metrics, or playful microcopy in clinical moments.

Trust is created through:

- clear doctor identity;
- transparent price and duration;
- precise date and timezone;
- visible booking and payment status;
- plain-language privacy statements;
- clear support and recovery paths;
- consistent actions;
- restrained color;
- professional typography;
- no unexplained failures.

### 3.4 Patients need reassurance; doctors need speed

Patient interfaces should be guided, explanatory, and forgiving.

Doctor interfaces should be denser, keyboard-friendly, and optimized for
repeated use. Using the same density and card style for both roles is not the
right goal. They should share a design system, not an identical layout.

### 3.5 Every state must answer “what happens next?”

No important screen should end with only a status. It should explain:

- what the status means;
- whether the user needs to do anything;
- when the next action becomes available;
- where to get help if it fails.

## 4. Current patient dashboard audit

This section refers directly to the current `/patient` dashboard.

### 4.1 What is working

- The sidebar labels are understandable.
- The teal palette is appropriate for a patient-facing healthcare product.
- Typography is readable and visual noise is low.
- The page has a clear top-level booking action.
- Profile completeness is useful because it has clinical value.
- Doctor fee and consultation duration are visible.
- Empty states are not completely blank.
- Cards and spacing are reasonably consistent.

### 4.2 What is weak

#### Four zero-value statistics are wasted priority

“0 Upcoming”, “0 Consultations”, and “0 Prescriptions” tell a new user three
versions of the same thing: nothing has happened yet. These cards occupy the
most valuable area of the page and make the product feel empty.

The profile percentage is actionable, but it is visually treated as equal to
historical counts. It is not equal. Profile completion can directly improve
care and should be presented as a task, not a statistic.

**Recommendation:** hide historical metrics for a new patient. Show useful
contextual steps instead. Historical summaries may appear after the patient
has completed consultations.

#### Booking is repeated too many times

The page includes:

- the header “Book a visit” button;
- “Book a consultation” inside the empty appointment card;
- “Book a visit” inside the doctor card;
- “Book a visit” in the sidebar.

This is not stronger conversion design. It is duplicated hierarchy.

**Recommendation:** retain one primary CTA in the main state card. Keep the
sidebar item as navigation. Doctor card actions should be secondary.

#### The largest card is mostly empty

The “Next appointment” card consumes a large area even when no appointment
exists. Its empty state is centered in a box designed for populated data.

**Recommendation:** replace it with a purposeful first-visit panel containing:

- a direct headline;
- three short steps;
- price and duration;
- one booking CTA;
- a short reassurance about secure payment and video consultation.

#### “Your doctor” is not credible enough

“Your doctor”, “General physician”, and the initials “DR” look like
placeholder content. In a single-doctor product, doctor trust is one of the
strongest conversion assets.

The card should show real:

- name;
- qualification;
- specialty;
- registration or credential information where legally appropriate;
- experience;
- languages;
- consultation fee;
- duration;
- optional professional photograph;
- short availability statement.

Do not display credentials that have not been verified.

#### The interface has weak emotional orientation

“Welcome back” and four stats are standard dashboard content. A patient
arriving because they feel unwell needs stronger orientation.

Better examples:

- “How can we help today?”
- “Your next consultation is confirmed.”
- “Your consultation starts in 18 minutes.”
- “Your prescription is ready.”

The message should be driven by the current care state.

#### The page does not explain the service

A first-time patient may not know:

- whether the consultation is video or phone;
- whether payment is refundable;
- how long it lasts;
- when the room opens;
- whether a prescription will be provided;
- what to do during an emergency.

Not all of this belongs in a large FAQ. The most relevant facts should appear
near the primary action.

### 4.3 Desktop composition problems

- The content begins far from the left navigation, creating a large dead
  margin at common desktop widths.
- The sidebar footer is visually crowded: identity, role badge, avatar-like
  element, and logout are competing near the bottom edge.
- The main area uses several equal-looking cards even though their importance
  is not equal.
- The ambient glow in the bottom-right is decorative but does not improve task
  understanding.
- Four differently tinted metric cards add color without adding meaning.

### 4.4 Target patient home

The patient home should be state-driven.

#### State A: new patient, no booking

Primary panel:

- Heading: “How can we help today?”
- Supporting text: “Book a private video consultation with Dr. [Name].”
- One CTA: “Book a consultation”
- Fee, duration, and next available date
- Three-step summary: Choose a time → Pay securely → Meet by video

Secondary panel:

- “Complete your medical profile”
- Show the exact missing high-value fields, not only a percentage
- Explain why: “Allergies and current medicines help your doctor treat you
  safely.”

Lower content:

- doctor trust card;
- emergency disclaimer;
- recent prescriptions only when data exists.

Do not show zero-value statistics.

#### State B: payment hold exists

Primary panel:

- “Your slot is held”
- exact date and time;
- countdown with an accessible text alternative;
- amount due;
- one CTA: “Complete payment”;
- secondary action: “Choose another time”.

This state must survive refresh and explain that the slot is not confirmed
until payment succeeds.

#### State C: confirmed future appointment

Primary panel:

- status: Confirmed;
- doctor name and photograph/initials;
- full date, local time, and duration;
- relative time, such as “Tomorrow”;
- one CTA: “View appointment”;
- preparation checklist;
- reschedule/cancel policy as secondary actions.

Do not show a disabled join button days in advance as the main action.

#### State D: consultation window is open

Primary panel:

- urgent but calm visual treatment;
- “Your consultation room is open”;
- one unmistakable CTA: “Join consultation”;
- camera/microphone preparation note;
- fallback guidance if joining fails.

This should override almost every other dashboard element.

#### State E: consultation completed

Primary panel:

- “Your consultation is complete”;
- prescription state:
  - ready: “View prescription”;
  - not issued: explain that no prescription was issued;
  - pending doctor completion: “The doctor is finishing your notes.”
- consultation summary link;
- receipt link.

## 5. Patient navigation

### 5.1 Desktop

Recommended primary navigation:

1. Home
2. Book consultation
3. Appointments
4. Prescriptions
5. Medical profile

Account settings should live in the user menu, not compete with care
navigation.

The sidebar can remain, but improve it:

- reduce its width slightly if content remains narrow;
- make the active item stronger than a faint tinted background;
- use one consistent label: choose “Book consultation” or “Book a visit”, not
  both;
- show the patient name and email once;
- put logout inside an account menu or clearly separated footer action;
- never let content overlap the viewport edge.

### 5.2 Mobile web

The current horizontally scrolling top navigation is not an industrial mobile
navigation solution. Labels can be clipped, important actions can move off
screen, and the user has no stable spatial model.

Use a bottom navigation bar for the patient experience:

1. Home
2. Appointments
3. Book
4. Prescriptions
5. Profile

Rules:

- “Book” may be visually emphasized, but it must not look like an unrelated
  floating advertisement.
- Respect iOS and Android safe areas.
- Keep labels visible; icons alone are not sufficient.
- Hide the bottom navigation inside the call experience and during focused
  payment checkout.
- Account settings are reached from the profile screen.

The future native mobile application should use the same information
architecture, even though its components will be native.

## 6. Authentication and onboarding

### 6.1 Sign-in

Email OTP is the correct default for this audience, but the screen must make
the sequence explicit:

1. Enter email.
2. Receive a six-digit code.
3. Verify and continue.

Required behavior:

- visible loading state after requesting a code;
- clear success confirmation with the destination email;
- resend timer;
- “change email” action;
- segmented OTP entry or a single field with correct autocomplete;
- paste support;
- precise errors for expired, incorrect, and rate-limited codes;
- no account-existence disclosure;
- valid redirect back to the action that triggered sign-in;
- Google sign-in only if reliably configured.

Do not present password and OTP as equal defaults unless the product has a
clear password strategy. The current product language says passwordless; the
interface and backend policy must remain consistent.

### 6.2 First-login onboarding

Do not force a long onboarding wizard before a patient can inspect
availability. Ask only what is needed at the moment it becomes needed.

Recommended sequence:

1. Name confirmation.
2. Optional medical profile nudge.
3. Home state with booking CTA.

Before final booking confirmation, collect required consent and sufficient
clinical intake.

### 6.3 Emergency safety

Every entry point into booking should state that the service is not for
emergencies. This should not be a hidden footer-only legal sentence.

If red-flag symptoms are detected:

- interrupt the normal flow;
- use direct language;
- advise contacting local emergency services;
- do not imply a diagnosis;
- allow the user to return only after acknowledging the warning where legally
  appropriate;
- log the event safely without storing unnecessary symptom text in analytics.

## 7. Booking workflow redesign

The existing four-step structure is fundamentally correct:

1. Tell us what is wrong.
2. Choose a time.
3. Pay.
4. Confirmation.

The redesign should improve confidence, progress visibility, error recovery,
and mobile usability.

### 7.1 Stepper

Desktop:

- show all four labels;
- highlight current step;
- mark completed steps;
- allow going back only where it does not invalidate the slot hold.

Mobile:

- use “Step 1 of 4” plus current step title;
- use a compact progress line;
- do not squeeze four full labels into a narrow row.

Never visually mark a future step as complete while restoring a booking from
the URL.

### 7.2 Intake

Recommended structure:

1. Visit reason
2. Describe the problem
3. Optional report
4. Consent and emergency acknowledgement

Visit-reason cards should:

- have concise descriptions;
- use radio semantics;
- show a selected state beyond color;
- be easy to tap;
- avoid decorative icons unless they improve recognition.

Symptoms field should prompt useful information:

> Describe what you are feeling, when it started, and whether it is getting
> better or worse.

Do not ask the patient to write clinical terminology.

Report upload must show:

- accepted file types;
- maximum size;
- upload progress;
- successful filename;
- replace/remove actions;
- understandable failure messages;
- explicit privacy statement.

### 7.3 Slot selection

This is one of the most commercially important screens.

Required hierarchy:

- doctor identity;
- selected date;
- timezone;
- available times grouped by morning, afternoon, and evening;
- price and duration;
- selected slot summary;
- continue action.

Use a short horizontal date strip on mobile and a week/date control on
desktop. Do not force users through a full calendar when only a small date
range has availability.

Clearly distinguish:

- available;
- selected;
- unavailable;
- recently taken;
- loading.

When a slot loses a race:

> That time was just booked by another patient. No payment was taken. Please
> choose another available time.

Do not show a generic 409 or “something went wrong.”

### 7.4 Payment

The payment screen must maximize confidence.

Show:

- doctor;
- consultation date and time;
- duration;
- consultation fee;
- taxes or platform fees, if any;
- total;
- slot-hold expiration;
- cancellation/refund policy;
- secure payment provider;
- one “Pay ₹X” CTA.

Do not use a generic “Confirm” label for a real charge.

Payment states:

- creating order;
- checkout open;
- payment submitted;
- verifying payment;
- confirmed;
- failed;
- cancelled by user;
- verification delayed.

The UI must not claim failure simply because the browser callback was
interrupted. Razorpay webhook reconciliation is authoritative. For an
uncertain result:

> We are checking your payment. Do not pay again yet.

Provide a retry/status-refresh action.

### 7.5 Confirmation

This screen should feel final and useful, not merely celebratory.

Show:

- “Your consultation is confirmed”;
- doctor;
- date and time;
- duration;
- amount paid;
- appointment reference;
- “View appointment” primary action;
- calendar-add action where supported;
- preparation checklist;
- reminder expectation;
- cancellation/reschedule policy;
- receipt link.

Avoid confetti or excessive animation in a healthcare payment flow.

## 8. Appointment detail as the command center

The appointment detail page should be the single source of truth before,
during, and after a consultation.

### 8.1 Before the consultation

Show in this order:

1. Status and next action
2. Doctor and time
3. Join availability
4. Preparation checklist
5. Intake summary and uploaded report
6. Payment and receipt
7. Reschedule/cancel policy

Preparation checklist:

- stable internet connection;
- quiet and well-lit room;
- camera and microphone permission;
- relevant reports or medicine packages nearby;
- join five to ten minutes early.

### 8.2 Join-call behavior

Long before the slot:

- show when the room will open;
- do not present a prominent disabled button without context.

Within the join window:

- primary CTA becomes “Join consultation”;
- show “Room is open” status;
- make it visible above the fold on desktop and mobile.

After the allowed window:

- explain why joining is no longer available;
- provide the next valid action, such as contacting the clinic or booking
  another consultation;
- do not show only “too late.”

### 8.3 After the consultation

The same page should update to show:

- completion status;
- diagnosis if recorded for patient display;
- issued prescription;
- advice and follow-up instructions;
- receipt;
- “Book follow-up” action with the reason preselected where appropriate.

## 9. Video consultation experience

The current LiveKit integration provides a valid technical base. The UX needs
additional product framing.

### 9.1 Pre-join

Required:

- doctor and appointment context;
- camera preview;
- microphone level feedback;
- camera and microphone toggles;
- selected device controls on desktop;
- permission guidance;
- “Join consultation” CTA;
- clear privacy note;
- browser/device support guidance.

If permission is denied, explain exactly where to enable it for the current
platform. “We couldn't access your camera” is not sufficient.

### 9.2 In-call

Keep controls conventional:

- microphone;
- camera;
- switch camera on mobile;
- speaker/audio output where supported;
- leave call;
- connection quality;
- participant names.

Do not add chat or recording merely because LiveKit supports them. They are
outside the product scope and introduce privacy and operational complexity.

### 9.3 Disconnection

Accidental disconnection should not immediately dump the user on the home
page.

Show a reconnect state:

- “Reconnecting…”
- automatic retry;
- manual retry;
- return to appointment;
- support guidance after repeated failure.

Leaving intentionally should require a clear action and return the user to the
appointment detail, not a generic root route.

### 9.4 Consultation ended

Patient:

- “Consultation ended”;
- prescription/notes expectation;
- return to appointment.

Doctor:

- return to encounter;
- visible unsaved/autosaving state;
- complete outcome and prescription tasks.

## 10. Prescriptions

Prescriptions are a core output, not a secondary list of cards.

### 10.1 List

Each item should show:

- issue date;
- doctor;
- diagnosis or consultation label;
- medicine count;
- status;
- clear open action.

Group by year only when the list becomes long. Search is unnecessary for a
small v1 list.

### 10.2 Detail

Use a document-like clinical layout:

- doctor and clinic identity;
- patient identity;
- issue date and validity;
- diagnosis;
- medicine table/list;
- dose timing in plain language;
- relation to food;
- duration;
- special instructions;
- advice and follow-up;
- immutable-issued status;
- print/download/share actions where safe.

Medicine schedules must not rely only on icons such as sun and moon. Always
include text.

Use strong warnings for allergies or contraindication-related notes only when
entered by the doctor. Do not generate medical warnings from the UI.

## 11. Medical profile

The current form collects useful v1 fields but presents them as one long
undifferentiated form.

Recommended sections:

1. Personal details
2. Allergies
3. Ongoing conditions
4. Current medicines
5. Emergency contact

Improvements:

- show “None known” choices for allergies, conditions, and medicines;
- distinguish “not answered” from “none”;
- autosave or provide clear unsaved-change behavior;
- validate phone numbers without assuming one global format;
- explain who can see each category;
- show last updated date;
- allow editing from the appointment preparation checklist;
- calculate completeness using clinically important fields, not arbitrary
  field count alone.

A patient should never enter “None” merely to make a progress meter reach
100%. The data model and UI should represent explicit negatives properly.

## 12. Doctor dashboard

### 12.1 What the doctor needs

At the beginning of a clinic session, the doctor needs:

- who is next;
- whether the patient has arrived;
- the consultation time;
- the intake reason;
- any urgent allergy/profile information;
- one action to open the encounter or join;
- what remains incomplete from prior consultations.

Lifetime “completed” and “collected” metrics are secondary. They should not
compete with the next patient.

### 12.2 Target hierarchy

1. Clinic status / next patient
2. Today's timeline
3. Attention-required queue
4. Setup warnings, only while incomplete
5. Summary metrics

Attention-required examples:

- appointment completed but outcome not recorded;
- draft prescription not issued;
- patient waiting;
- payment verification exception;
- upcoming appointment with missing intake.

### 12.3 Today's schedule

Use a compact timeline or table rather than isolated cards.

Columns/content:

- time;
- patient;
- visit reason;
- waiting status;
- appointment status;
- action.

The doctor must be able to scan five consecutive patients without scrolling
through excessive card padding.

## 13. Doctor appointment management

The current Today/Upcoming/Past grouping is good, but filters apply mainly to
past appointments and the page is visually card-heavy.

Target:

- date range;
- status;
- patient search;
- visit reason where useful;
- clear filter summary;
- URL-persisted filters;
- compact table/list on desktop;
- touch-friendly cards on mobile;
- today section always operationally prominent.

Each row should reveal:

- patient;
- date/time;
- reason;
- status;
- waiting presence;
- prescription/note completion state;
- direct action.

## 14. Doctor encounter workspace

This is the highest-risk and highest-value doctor screen.

### 14.1 Current strengths

- Patient snapshot exists.
- Allergies can be visually emphasized.
- Intake and reports are accessible.
- SOAP notes and prescription are on one route.
- Returning-patient history is available.
- Medicine history exists.
- Call and outcome actions are present.

### 14.2 Current risks

- The screen is a vertical stack of many cards, forcing repeated scrolling.
- Patient context, call controls, outcome controls, notes, prescription, and
  history compete for attention.
- “Mark completed” can conceptually happen before clinical documentation is
  finished.
- Issuing a prescription is irreversible but can be visually lost inside a
  long page.
- Long histories can make the active encounter harder to operate.
- Critical allergy information can scroll away.

### 14.3 Target desktop layout

Sticky patient header:

- patient name, age, gender;
- appointment time and status;
- waiting presence;
- allergy warning;
- join/return-to-call action;
- encounter completion state.

Main workspace:

- left/main: SOAP note and prescription tabs or vertically coordinated work
  area;
- right/sticky: intake, profile snapshot, reports, and collapsible history.

Footer or sticky action region:

- autosave state;
- draft/issued prescription state;
- mark completed/no-show actions;
- explicit unresolved-task warnings.

### 14.4 Clinical action safety

Before issuing a prescription:

- show a confirmation summary;
- state that it cannot be edited afterward;
- list medicine count and diagnosis;
- block issue when required fields are invalid;
- never silently discard unsaved note changes.

Before marking completed:

- warn if prescription remains a draft;
- warn if the SOAP note is empty;
- allow completion without prescription when clinically appropriate;
- do not force medication where none is required.

No-show:

- separate visual treatment;
- confirmation dialog;
- explain patient-visible consequence;
- prevent accidental selection next to “Completed.”

### 14.5 Autosave

Autosave must expose state:

- Saving…
- Saved at 6:24 PM
- Offline / changes not saved
- Retry

Never rely on an invisible background save for clinical notes.

## 15. Visual design direction

### 15.1 Brand character

MediFlow should feel:

- calm;
- credible;
- humane;
- precise;
- modern;
- India-aware without looking regionally stereotyped;
- clinical without looking like a hospital billing system.

It should not feel:

- like a fintech dashboard;
- like a generic admin template;
- like a wellness or fitness app;
- playful during clinical or payment actions;
- over-designed with animated gradients and glass everywhere.

### 15.2 Color

Keep teal as the patient primary color and indigo as the doctor workspace
accent if role differentiation remains useful.

Recommended color roles:

- Primary: main actions and active navigation
- Success: confirmed, completed, paid
- Warning: payment hold, upcoming preparation, incomplete tasks
- Destructive: cancellation, no-show, allergy alert, serious failure
- Neutral: history, metadata, inactive controls

Do not assign a different decorative color to every statistic. Color must
communicate state or category consistently.

Minimum contrast must meet WCAG 2.2 AA:

- 4.5:1 for standard text;
- 3:1 for large text and meaningful interface graphics.

### 15.3 Typography

Use a restrained type scale:

| Role | Suggested treatment |
|---|---|
| Page title | 28–32px desktop, 24–28px mobile, semibold |
| Section title | 18–20px, semibold |
| Card title | 16–18px, medium/semibold |
| Body | 15–16px |
| Supporting text | 14px minimum |
| Metadata | 12–13px, only for genuinely secondary content |

Do not use small grey text for important appointment instructions.

### 15.4 Spacing and surfaces

- Use fewer, stronger containers.
- Prefer page sections over wrapping every small group in a card.
- Reserve elevated cards for actionable or bounded content.
- Avoid `glass` on every surface; it weakens hierarchy and can reduce
  contrast.
- Use 16px mobile page padding and 24–32px desktop section spacing.
- Keep touch targets at least 44x44 CSS pixels.
- Use consistent card radii rather than mixing many rounded values.

### 15.5 Icons and illustration

- Use icons to support labels, never replace important labels.
- Avoid multiple similar calendar icons that users cannot distinguish.
- Use empty-state illustration sparingly.
- A real doctor photograph is more valuable than decorative healthcare
  artwork.

### 15.6 Motion

Use motion for:

- route feedback;
- step transitions;
- state confirmation;
- expanding details;
- payment verification progress.

Avoid continuous floating motion inside the authenticated clinical product.
It adds little value and can feel less serious. Respect reduced-motion
preferences.

## 16. Content design and terminology

Choose one term and use it consistently:

- Preferred: **consultation**
- Acceptable contextual alternative: **appointment**
- Avoid mixing “visit”, “booking”, and “consultation” for the same primary
  action.

Recommended labels:

| Current/mixed | Recommended |
|---|---|
| Book a visit | Book consultation |
| My appointments | Appointments |
| Complete your profile | Add medical information |
| Awaiting payment | Payment required |
| Join video consultation | Join consultation |
| No-show | Missed appointment for patients; No-show for doctor |

Content rules:

- use sentences patients understand;
- avoid internal status names;
- avoid promising medical outcomes;
- never say “secure” unless the claim is supportable;
- avoid blaming the user for technical failures;
- include the next action in errors;
- show exact dates and times in critical confirmations.

## 17. Empty, loading, error, and offline states

### 17.1 Empty states

An empty state needs:

- what is empty;
- why it is empty, when useful;
- what the user can do;
- one appropriate action.

Do not use large empty containers just to preserve a populated layout.

### 17.2 Loading

Every dynamic route should show immediate visual feedback. Next.js dynamic
routes should use appropriate `loading.tsx` skeletons so navigation never
appears dead.

Rules:

- skeletons should resemble the destination layout;
- avoid full-page spinners;
- do not show fake values;
- preserve navigation while content loads;
- announce significant loading state to assistive technology where needed.

### 17.3 Errors

Error structure:

1. What failed
2. What it means
3. Whether data/payment was saved
4. What to do next
5. Support path if retry fails

Examples:

**Bad:** “Something went wrong.”

**Better:** “We couldn't load available times. Your information is still
saved. Check your connection and try again.”

### 17.4 Offline and unstable networks

At minimum:

- detect offline state;
- prevent duplicate payment actions;
- preserve unsent form content locally where safe;
- do not store sensitive clinical content in insecure browser storage;
- retry idempotent requests;
- show explicit note-save failure;
- recover appointment/payment state from the server.

## 18. Accessibility standard

Target WCAG 2.2 AA for web.

Required:

- full keyboard navigation;
- visible focus;
- semantic heading hierarchy;
- form labels and useful descriptions;
- field-level error association;
- status not communicated by color alone;
- screen-reader announcements for OTP sent, upload complete, payment
  verification, and autosave failure;
- dialogs that trap focus and restore it correctly;
- no motion-only information;
- 200% zoom without loss of content;
- mobile landscape support for critical flows;
- touch targets at least 44x44;
- captions/transcript decisions documented if later required;
- accessible LiveKit controls verified, not assumed.

Test with:

- keyboard only;
- VoiceOver on iOS/macOS;
- TalkBack on Android;
- browser zoom;
- reduced motion;
- high contrast where available.

## 19. Responsive behavior

### 19.1 Breakpoint philosophy

Do not treat mobile as a desktop grid stacked vertically. Re-prioritize
content.

Mobile order should generally be:

1. current status;
2. primary action;
3. essential appointment information;
4. preparation or safety information;
5. secondary history.

### 19.2 Patient mobile

- bottom navigation;
- full-width primary CTA;
- sticky action during booking/payment where appropriate;
- compact date and slot selectors;
- no horizontal page overflow;
- forms optimized for correct keyboard type;
- safe-area padding;
- avoid modal-heavy workflows.

### 19.3 Doctor mobile

The doctor encounter is possible on mobile but is not naturally ideal for
long SOAP and prescription work.

For the future mobile app:

- optimize appointment triage, patient review, join call, and outcome first;
- provide reliable draft note entry;
- use section navigation for SOAP;
- make prescription rows easy to add and reorder;
- warn before leaving with unsaved content;
- test with real five-patient clinic sessions.

Do not claim mobile doctor parity merely because every desktop control fits on
a narrow screen.

## 20. Privacy, safety, and compliance UX

This document is not legal advice. Formal legal and healthcare compliance
review is still required for launch jurisdictions.

UX requirements:

- clear consent before teleconsultation;
- accessible Terms and Privacy;
- transparent report-upload handling;
- no sensitive medical content in push notification text;
- no symptom or diagnosis content in analytics event properties;
- visible account deletion path for mobile store compliance;
- camera/microphone rationale before permission prompts;
- no recording without separate explicit consent and legal approval;
- emergency-service warning;
- doctor credential display based on verified data;
- prescription and receipt access protected by session and ownership checks.

## 21. Analytics and product measurement

Measure workflow health, not vanity engagement.

Recommended funnel:

1. Sign-in started
2. Sign-in completed
3. Booking intake completed
4. Slot selected
5. Payment opened
6. Payment confirmed
7. Appointment detail viewed
8. Join attempted
9. Call connected
10. Call completed
11. Prescription viewed

Operational measures:

- OTP request and verification failure rate;
- time to complete booking;
- slot-selection abandonment;
- payment failure and uncertain-payment rate;
- call permission denial rate;
- call connection failure;
- reconnection count;
- doctor note save failures;
- prescription issue failures;
- cancellation and no-show rate;
- support contacts by workflow stage.

Never capture:

- symptom text;
- SOAP content;
- diagnosis;
- prescription content;
- report filenames;
- emergency contact;
- full email or phone as analytics properties.

## 22. Design system deliverables

Before broad implementation, define:

- semantic color tokens;
- typography scale;
- spacing scale;
- radius and elevation rules;
- button hierarchy;
- form field states;
- status badge vocabulary;
- banners and alerts;
- empty-state pattern;
- skeleton pattern;
- mobile bottom navigation;
- desktop sidebar;
- appointment summary component;
- doctor identity component;
- prescription medicine component;
- critical confirmation dialog;
- toast usage rules;
- responsive page templates.

Every component needs:

- default;
- hover where applicable;
- focus;
- active;
- disabled;
- loading;
- error;
- compact/mobile behavior;
- accessible name and description rules.

## 23. Screen-by-screen target inventory

### Public and auth

- Landing page
- Login / OTP request
- OTP verification
- Terms
- Privacy
- Not found
- Generic recoverable error

### Patient

- State-driven home
- Booking intake
- Slot selection
- Payment
- Confirmation
- Appointments list
- Appointment detail
- Call pre-join
- In-call
- Call ended/reconnect
- Prescriptions list
- Prescription detail
- Medical profile
- Account settings
- Receipt

### Doctor

- Operational dashboard
- Appointments
- Weekly schedule
- Availability settings
- Patient roster
- Patient history
- Encounter workspace
- Call pre-join
- In-call
- Profile/account settings

Each screen must be designed for:

- populated state;
- empty state;
- loading;
- recoverable error;
- permission failure where relevant;
- narrow mobile;
- desktop;
- long content;
- realistic names and medical text.

## 24. Prioritized redesign roadmap

### P0: Safety and workflow clarity

Complete before visual polish:

1. Fix all dead-click, redirect, and no-feedback navigation states.
2. Standardize authentication and OTP behavior.
3. Make payment states and webhook reconciliation understandable.
4. Improve call permission, reconnect, and return behavior.
5. Make autosave status visible in the doctor encounter.
6. Audit irreversible clinical actions.
7. Standardize appointment status labels.
8. Ensure emergency warnings and consent are correctly placed.

### P1: Patient conversion and consultation success

1. Replace zero-stat patient home with state-driven home.
2. Redesign booking hierarchy and mobile stepper.
3. Redesign slot selection.
4. Redesign payment summary.
5. Make appointment detail the command center.
6. Improve confirmation and preparation guidance.
7. Improve prescription readability.
8. Implement stable patient mobile navigation.

### P2: Doctor operational efficiency

1. Reorder doctor dashboard around next patient and attention queue.
2. Convert today's schedule into a compact operational list.
3. Redesign encounter as a sticky clinical workspace.
4. Improve history scanning.
5. Improve completion/no-show/prescription safeguards.
6. Improve mobile doctor workflow without pretending it is desktop.

### P3: Visual system and refinement

1. Reduce excessive card and glass usage.
2. Formalize design tokens and type scale.
3. Improve real doctor identity and trust content.
4. Add purposeful loading skeletons.
5. Standardize content tone.
6. Complete accessibility testing.
7. Add restrained micro-interactions.

## 25. Suggested implementation phases

### Phase 1: UX foundation

- terminology;
- status vocabulary;
- design tokens;
- navigation patterns;
- page templates;
- accessibility baseline;
- analytics specification.

### Phase 2: Patient core

- home;
- booking;
- payment;
- confirmation;
- appointment detail;
- call preparation.

### Phase 3: Patient aftercare

- prescription;
- receipt;
- profile;
- follow-up booking;
- settings.

### Phase 4: Doctor clinic operations

- dashboard;
- appointments;
- encounter;
- history;
- schedule.

### Phase 5: Hardening

- responsive QA;
- accessibility;
- slow/offline network;
- long-content testing;
- production-like data;
- analytics validation;
- error recovery;
- security and privacy review.

## 26. Acceptance criteria

The redesign is not complete because it “looks better.” It is complete when
the following are demonstrably true.

### Patient

- A first-time patient can identify the primary action within five seconds.
- No screen displays multiple competing primary CTAs.
- Booking price, duration, doctor, and time are clear before payment.
- Refreshing during a held or paid booking restores the correct state.
- An uncertain payment never encourages immediate duplicate payment.
- The patient knows exactly when the call room opens.
- Camera/microphone denial has platform-specific recovery guidance.
- Call disconnection offers reconnection.
- Prescription instructions are readable without interpreting icons.
- All critical flows work at 320px CSS width and 200% zoom.

### Doctor

- The next patient and waiting status are visible without scrolling.
- Today's clinic can be scanned quickly.
- Allergies remain visually prominent during the encounter.
- Note save state is always visible.
- A draft prescription cannot be mistaken for an issued prescription.
- Issuing and outcome actions require appropriate confirmation.
- A doctor can complete five consecutive consultations without losing work or
  navigating through unrelated pages.

### Quality

- WCAG 2.2 AA audit has no critical failures.
- Critical routes have loading and error states.
- No protected medical content is included in analytics or notifications.
- User-facing copy does not expose internal statuses or HTTP errors.
- Android, iOS, mobile web, and desktop behavior are explicitly tested for the
  workflows they support.

## 27. Specific recommendations for the screenshot

If only the shown patient dashboard were redesigned, the recommended result
would be:

1. Remove the four metric cards for a new patient.
2. Replace the large empty appointment card with a focused first-booking hero.
3. Keep one primary “Book consultation” CTA.
4. Move medical-profile completion directly below the primary task.
5. Upgrade the doctor card with real identity and credentials.
6. Hide recent prescriptions entirely when none exist, or reduce them to a
   small explanatory row.
7. Standardize “visit” and “consultation” terminology.
8. Clean up the sidebar account footer and logout placement.
9. Reduce decorative glass and ambient glow inside the portal.
10. Use stronger content hierarchy and less empty card space.

Suggested desktop structure:

```text
+---------------------------------------------------------------+
| Good morning, [Name]                    [Help / Account menu]  |
| How can we help today?                                       |
+--------------------------------------+------------------------+
| Book a private video consultation    | Dr. [Real Name]        |
| Next available: Today, 6:20 PM       | Specialty, credentials |
| ₹500 · 20 minutes                    | Languages / experience |
| [Book consultation]                  |                        |
| Choose time -> Pay -> Meet by video  |                        |
+--------------------------------------+------------------------+
| Add medical information              | How online care works  |
| Allergies and medicines are missing  | 1. Book                |
| [Complete profile]                   | 2. Join                |
|                                      | 3. Get prescription    |
+--------------------------------------+------------------------+
```

Once an appointment exists, the booking panel is replaced by the appointment
state. The rest of the page adapts around that state.

## 28. Decisions that need product confirmation

Before final design:

1. Exact public doctor credentials and verification process.
2. Cancellation and refund policy.
3. Clinic support channel and operating hours.
4. Whether patients can add appointments to external calendars.
5. Whether follow-up booking should prefill the previous reason.
6. Whether a consultation can be marked complete before prescription issue.
7. Expected delay between call completion and prescription availability.
8. Whether doctor mobile workflow is required for initial mobile launch or a
   later release.
9. Legal wording for consent, emergency warnings, and prescription display.
10. Retention and deletion policy for reports and consultation data.

## 29. Documentation issues noticed during audit

- `docs/AppFlow.md` currently begins with malformed text before its heading.
  This should be corrected separately when documentation cleanup is approved.
- `docs/PRD.md` still lists native mobile apps as a non-goal, while
  `docs/MobileAppPlan.md` explicitly supersedes that decision. The PRD should
  eventually be updated so future contributors do not receive conflicting
  direction.
- `docs/Design.md` says patient pages should use a narrow single-column layout,
  while the current patient dashboard uses a wide bento dashboard. This
  document recommends a state-driven responsive layout rather than enforcing
  one width for every patient screen.
- Terminology is inconsistent across code and documentation: “visit,”
  “appointment,” “booking,” and “consultation” are used interchangeably.

## 30. Final position

MediFlow does not need more dashboard widgets. It needs stronger prioritization
of the care journey already supported by the backend.

The best next design work is not:

- more gradients;
- more animation;
- more statistics;
- more cards;
- more features.

The best next design work is:

- state-driven patient guidance;
- a trustworthy doctor presentation;
- a confident booking and payment journey;
- an appointment page that owns the entire consultation lifecycle;
- resilient video entry and recovery;
- clinically safe doctor actions;
- a denser, faster doctor workspace;
- consistent terminology and accessibility.

If those elements are executed well, the product will feel significantly more
professional without becoming visually loud or functionally bloated.
