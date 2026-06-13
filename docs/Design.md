# MediFlow v2 — Design Guide

## Principles

1. **Patients are non-technical.** Every patient-facing screen has one obvious action. Booking is a guided stepper; the call has a pre-join camera/mic check; errors say what to do next ("Your slot hold expired. Please pick a new time.").
2. **The doctor is in a hurry.** Doctor screens are dense by comparison: the encounter puts intake, note, prescription, and history on one screen; the appointments list groups Today first.
3. **Calm, clinical, trustworthy.** Neutral palette, no marketing flourishes, statuses as quiet badges.

## System

- **Component library**: shadcn/ui on Tailwind 4 (`src/components/ui/`) — button, card, badge, input, label, textarea, select, radio-group, alert-dialog, separator. Add via `npx shadcn@latest add <name>`; don't hand-roll equivalents.
- **Icons**: lucide-react, 16px (`h-4 w-4`), always with a text label except where `aria-label` is provided.
- **Typography**: page title `text-2xl font-semibold` + one-line `text-muted-foreground` description. Card titles via `CardTitle`.
- **Layout**: patient pages `max-w-2xl mx-auto` single column; doctor encounter `max-w-6xl` with a 3/2 grid (work area / history). App chrome is a single top header (`AppHeader`) with role-based nav links.
- **Status colors**: confirmed = default badge, completed = secondary, cancelled/no-show = destructive/outline, awaiting payment = outline. Labels in `STATUS_LABELS` maps — human words, never raw enum values.
- **Money**: always `₹` with two decimals, stored in paise, divided only at render.
- **Dates**: always rendered in the doctor's timezone via `formatInTimeZone`; weekday-first formats ("Friday, Jun 12 at 6:20 pm").

## Patterns

- **Forms**: Label + control, save button with in-flight label ("Saving…"), inline result ("Saved" / destructive error text). No toasts so far — keep consistent.
- **Destructive/irreversible actions** (cancel appointment, issue prescription): confirmation dialog stating the consequence ("It can't be edited afterwards").
- **Empty states**: a sentence + the natural next action (e.g. "No prescriptions yet. They'll appear here after your consultations.").
- **Loading**: server components render complete; client fetches show a short muted sentence, not spinners-everywhere.

## Accessibility

- Every input has a `Label` or `aria-label` (including dynamic rows: "Medicine 2 name").
- Interactive elements are real buttons/links — no clickable divs.
- Color is never the only signal (badges carry text).

## v1 carryovers (see docs/v1-ui-flows.md)

Kept: 4-step booking stepper UX, SOAP section structure, visit-reason cards, pre-call device check, drag-style weekly availability editing (simplified to rule rows in v2 — revisit if the doctor asks). Dropped: widget-grid dashboards, chat UI, decorative page transitions.
