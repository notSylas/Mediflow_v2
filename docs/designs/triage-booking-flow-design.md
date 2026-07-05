# Triage + Booking Flow — Design Spec (conversion-critical)

Source: `/plan-design-review` on 2026-06-30. Scope: patient screens P2 Consult
chooser → P11 Booked. Calibrated to `docs/Design.md` ("Premium Clinical Glass":
Geist, cobalt patient identity, glass on hero surfaces only). Hi-fi mockups for
this flow were rendered in-session; this spec captures the design decisions and
the shadow states the mockups did not show.

## Initial vs final design score
7/10 → 9/10. The gap was happy-path-only mockups; this spec adds the shadow
states, conversion fixes, and a11y that make it buildable.

## Resolved design decisions

1. **AI-degrade UX (P3/P4/P5).** On any triage AI failure (down, malformed,
   refusal), show a calm one-line notice and drop the patient straight into the
   doctor list/search (pre-guess specialty if possible). Inline soft handoff, no
   dead end, never blocks booking.
2. **Visit reason moves to the start.** Capture "what's going on?" at P2/upload
   where intent is highest; carry it through; show it as an editable, skippable
   pre-filled summary on the P10 review screen. Remove the standalone P8 text
   gate before payment (highest-drop-off point).
3. **Slot-hold expiry (P9/P10).** Show a visible countdown ("slot held for 9:59")
   on review/pay. If it lapses, route to "Your hold expired, pick a new time"
   back to P9 — never a 409/500 at checkout.
4. **P2 entry weighting.** Report-upload is the visually dominant choice (larger,
   cobalt hero); symptom/search is a clear but lighter secondary below. Leads
   with the differentiator; resolves the "two equal template cards" slop risk.
5. **Triage empty/edge states (P5).** Warm, action-first:
   - No findings → "Nothing urgent stood out — here are general physicians if
     you'd like a check."
   - Zero doctor matches → fall back to general physician + manual search.
   - Low-confidence parse → "We couldn't read this clearly, search a doctor
     instead." Never a blank or "No results."
6. **Analyzing wait reassurance (P4).** Show progress ("reading values… matching
   specialists…") + a one-line "your report is private and encrypted." Turns
   anxious dead time into a trust moment.
7. **Design-system reconciliation.** Write gradient/shadow/color tokens into
   `mobile/src/lib/theme.ts` as the single source matching Design.md's oklch
   values (mockups used hex equivalents). Audit every glass surface (P5 finding
   chips especially) for WCAG 4.5:1 against its actual blurred background.
8. **Accessibility bundle (required for build).** 44px min touch targets (slot
   chips, filter "×"); aria-labels on icon-only controls (P14 call buttons);
   `prefers-reduced-motion` gating on the P4 spinner and hero entrance motion;
   proper visible labels + autofill on the OTP entry.

## Interaction state coverage (the spec the mockups were missing)

| Screen | Loading | Empty | Error | Partial |
|---|---|---|---|---|
| P3 Upload | upload progress | — | wrong type / too large → reject loudly before LLM spend | — |
| P4 Analyzing | progress + privacy copy | — | AI down → inline soft handoff to search (#1) | low-confidence parse → handoff (#5) |
| P5 Triage | — | no findings → warm GP suggestion (#5) | AI failed → search handoff (#1) | zero matches → GP + search (#5) |
| P9 Slot | — | no slots that day → next available | — | slot taken between view+tap → re-pick |
| P10 Pay | pay spinner | — | payment failed/cancelled → clear retry | hold expired → "pick a new time" (#3) |

## Pass ratings (before → after)
- Pass 1 Information architecture: 8 → 9
- Pass 2 Interaction states: 4 → 9
- Pass 3 Journey / emotional arc: 7 → 9
- Pass 4 AI slop risk: 8 → 9 (HYBRID classifier, no hard-rejection triggers)
- Pass 5 Design-system alignment: 6 → 9
- Pass 6 Responsive / accessibility: 5 → 8 (10 needs post-build verification)
- Pass 7 Unresolved decisions: 8 surfaced, 8 resolved

## NOT in scope (deferred)
- Post-build visual QA (run `/design-review` on the live screens).
- Doctor-side screens (separate review).
- Tablet/desktop web layouts (this flow is mobile-native first).

## What already exists (reuse)
`slot-picker`, `report-card`, `ChoiceChips`, `StatusBadge`, `EmptyState`,
`ErrorState`, `aurora-header`, `skeleton`. New triage screens MUST reuse
`EmptyState`/`ErrorState` for the failure UI above, not invent new patterns.
New components to add: `urgent-banner`, `triage-result-card`, `doctor-card`,
glass `finding-chip`.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | 12 accepted, 3 open decisions |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | issues_found | premature-marketplace + 14 gaps |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score 7/10 → 9/10, 8 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** DESIGN CLEARED — triage + booking flow is design-complete (9/10),
8 decisions resolved and specced. Eng Review still required before implementation
(it must validate the async triage + slot-hold + degrade-path architecture these
design decisions imply).

NO UNRESOLVED DECISIONS
