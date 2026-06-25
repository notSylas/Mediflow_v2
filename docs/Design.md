# MediFlow v2 — Design Guide

## Product Context
- **What this is:** A telemedicine app for a single doctor's India-based practice — patients book a paid video consultation, the doctor runs the encounter and issues a prescription.
- **Who it's for:** Non-technical patients (often on mobile) and one doctor who needs dense, fast clinical screens.
- **Memorable thing:** "This feels safer/more trustworthy than a random clinic app." Every decision below should serve that.

## Principles

1. **Patients are non-technical.** Every patient-facing screen has one obvious action. Booking is a guided stepper; the call has a pre-join camera/mic check; errors say what to do next ("Your slot hold expired. Please pick a new time.").
2. **The doctor is in a hurry.** Doctor screens are dense by comparison: the encounter puts intake, note, prescription, and history on one screen; the appointments list groups Today first.
3. **Calm, clinical, trustworthy — now with real depth.** Neutral palette, no marketing flourishes, statuses as quiet badges. Premium polish (glass, gradient, soft shadow) is spent only on the moments that carry emotional or financial weight — booking confirmation, payment, today's schedule — never spread across every surface. This is the Apple Health/Wallet reference point: even a product handling serious health data uses depth and gradient on result/state cards, while leaving dense data lists flat and scannable.

## Aesthetic Direction — "Premium Clinical Glass"

- **Decoration level:** intentional, not expressive. Glass/blur and gradient washes are reserved for hero/status surfaces; forms, tables, and dense doctor lists stay flat.
- **Mood:** health software that feels as considered as the device it runs on — depth and craft on the moments that matter, restraint everywhere data-dense.
- **Why this direction:** research into 2026 healthcare UI found near-universal convergence on Inter/IBM Plex Sans and "blue=trust" as the safe, generic choice. Apple Health/Wallet is one of the most globally trusted health interfaces and proves depth/gradient and trust are not in tension — the risk here is deliberate, not naive.

## System

- **Component library**: shadcn/ui on Tailwind 4 (`src/components/ui/`) — button, card, badge, input, label, textarea, select, radio-group, alert-dialog, separator. Add via `npx shadcn@latest add <name>`; don't hand-roll equivalents. The glass/gradient treatment below is a styling layer on top of these components, not a replacement for them.
- **Icons**: lucide-react, 16px (`h-4 w-4`), always with a text label except where `aria-label` is provided.

### Typography — one family, many weights

- **UI, headings, and body: Geist** (`next/font/google`) — the closest screen-native, geometrically precise typeface to Apple's SF Pro feel that isn't on the overused list (Inter, Roboto, Arial, etc.). Replaces the previously-used Figtree (headings) and Noto Sans (body) with a single coherent family, matching Apple's "one family, many weights" approach.
- **Money/data: Geist Mono** (kept — already shipped, already correct). Always tabular numerals for ₹ amounts, slot times, and prescription doses.
- **Scale:** page title `text-2xl font-semibold` + one-line `text-muted-foreground` description; card titles via `CardTitle`. Hero/glass-card amounts use a larger Geist Mono size (~34px/650 weight) to read like Apple Wallet's pass amounts.
- **Tradeoff, recorded honestly:** an earlier direction proposed Atkinson Hyperlegible Next for body text specifically for its low-vision accessibility design. That direction was superseded by this one. If accessibility complaints surface from real patients, revisit this typeface decision rather than assuming Geist is sufficient — this was a real tradeoff, not a freebie.

### Color — dual identity via gradient, not flat fill

The app has used a `.theme-doctor` class to flip the primary/accent color based on signed-in role since early in the project; this was previously undocumented here. Formalizing it:

- **Patient identity:** deep cobalt blue — `oklch(0.46 0.19 258)` primary, `oklch(0.68 0.16 258)` light variant for gradients. Apple Wallet-coded; reads instantly as "serious health tech" globally.
- **Doctor identity:** deep violet — `oklch(0.42 0.2 303)` primary, `oklch(0.65 0.17 303)` light variant. Applied automatically via the `.theme-doctor` class on the app shell wrapper — every primary/accent-colored component flips when the signed-in role is doctor. No per-component logic needed.
- **Execution:** on hero/status surfaces (booking confirmation, payment success, today's-schedule summary), the identity color renders as a diagonal gradient wash (`light → primary → primary-darkened`) with layered shadows for real elevation, not a flat fill. On dense screens (forms, tables, SOAP fields, patient history), colors stay flat per existing shadcn defaults — the gradient/glass budget is spent only where it earns trust, never where it would compete with scanability.
- **Semantic colors, explicit:** green (`--success`) means paid/confirmed only — never used as a default "primary action" color. Red (`--destructive`) means urgent/destructive only — cancel confirmations, no-show status, failed payments. This was already true in the code; it's now an explicit rule, not an implicit convention.
- **Money**: always `₹` with two decimals, stored in paise, divided only at render.
- **Dates**: always rendered in the doctor's timezone via `formatInTimeZone`; weekday-first formats ("Friday, Jun 12 at 6:20 pm").

### Glass & depth — where it's allowed

This is the core risk of this direction. Scope it tightly:

- **Allowed:** booking confirmation card, payment-success state, today's-schedule summary (patient and doctor dashboards), the doctor's patient-context strip (name/age/visit-reason at the top of an encounter), the prescription panel.
- **Not allowed:** SOAP note editor fields, patient history list, appointment tables/lists, forms, settings pages. These need to be scanned and typed into quickly — glass/blur actively works against that, and would contradict the "doctor is in a hurry" principle above.
- **Implementation:** `backdrop-filter: blur()` + `color-mix()`-based translucent backgrounds + layered `box-shadow` (a thin highlight shadow, a tight near shadow, and a soft far shadow — not a single flat shadow). See the approved preview at `~/.gstack/projects/{slug}/designs/design-system-{date}/approved-preview.html` for working CSS.
- **Accessibility constraint:** every glass surface must be checked for WCAG 4.5:1 text contrast against its blurred background, not just against the nominal color value — blur and transparency can silently drop effective contrast. Test with the actual background content behind it, not a solid swatch.

### Motion — intentional, not minimal

Previously "minimal-functional, no spinners-everywhere." Now: subtle entrance fade/scale on hero cards and status changes (the "feels expensive" signal), spring-ish easing (`cubic-bezier(.2,.8,.2,1)` or similar), always gated behind `prefers-reduced-motion: no-preference`. Dense list/table updates stay instant — motion is for state-change moments, not routine data display.

## Patterns

- **Forms**: Label + control, save button with in-flight label ("Saving…"), inline result ("Saved" / destructive error text). No toasts so far — keep consistent.
- **Destructive/irreversible actions** (cancel appointment, issue prescription): confirmation dialog stating the consequence ("It can't be edited afterwards").
- **Empty states**: a sentence + the natural next action (e.g. "No prescriptions yet. They'll appear here after your consultations.").
- **Loading**: server components render complete; client fetches show a short muted sentence, not spinners-everywhere.
- **Layout**: patient pages `max-w-2xl mx-auto` single column; doctor encounter `max-w-6xl` with a 3/2 grid (work area / history). App chrome is a single top header (`AppHeader`) with role-based nav links.
- **Status colors**: confirmed = default badge, completed = secondary, cancelled/no-show = destructive/outline, awaiting payment = outline. Labels in `STATUS_LABELS` maps — human words, never raw enum values.

## Accessibility

- Every input has a `Label` or `aria-label` (including dynamic rows: "Medicine 2 name").
- Interactive elements are real buttons/links — no clickable divs.
- Color is never the only signal (badges carry text).
- Glass surfaces: verify 4.5:1 text contrast against the actual blurred background, not a solid color assumption (see Glass & depth above).
- Motion: all entrance/transition animations gated behind `prefers-reduced-motion: no-preference`.

## v1 carryovers (see docs/v1-ui-flows.md)

Kept: 4-step booking stepper UX, SOAP section structure, visit-reason cards, pre-call device check, drag-style weekly availability editing (simplified to rule rows in v2 — revisit if the doctor asks). Dropped: widget-grid dashboards, chat UI, decorative page transitions.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-24 | Adopted "Premium Clinical Glass" direction via `/design-consultation`: Geist/Geist Mono typography (replacing Figtree+Noto Sans), cobalt-blue/violet dual identity (replacing teal/indigo), gradient/glass scoped to hero surfaces only, intentional motion | Two outside-voice proposals (Codex + Claude subagent) and three rounds of HTML preview iteration; user explicitly wanted an Apple Health/Wallet-grade "high UI design" feel over a more austere clinical-document direction that was tried and rejected first |
| 2026-06-24 | Documented the pre-existing `.theme-doctor` dual-identity color-swap mechanism, previously implemented in code but never written down | Found during this session's design audit — real doc-vs-code drift, same pattern as the PRD.md scope-fence drift fixed earlier this session |
