# MediFlow v2 — Docs Index

The map of what's authoritative vs reference. When two docs disagree on **scope**,
`PRODUCT.md` wins; on **live feature status**, `Tracker.md` wins.

## Product & scope
| Doc | What it is |
|---|---|
| [PRODUCT.md](PRODUCT.md) | **Master product plan** — vision, roadmap (phases), scope decisions, and the v1 baseline requirements (§8). Authoritative on scope. |
| [ProblemStatement.md](ProblemStatement.md) | The "why" — the doctor's no-show problem and why pay-at-booking (plus video, records, messaging) is the fix. |
| [Tracker.md](Tracker.md) | **Live status board** — per-feature done/in-progress/planned. Keep updated; check first when resuming. |

## Engineering
| Doc | What it is |
|---|---|
| [TechSpec.md](TechSpec.md) | Stack + key technical designs. |
| [AppFlow.md](AppFlow.md) | User flows + appointment state machine. |
| [Schema.md](Schema.md) | Database reference (keep in sync with `src/db/schema.ts`). |
| [Rules.md](Rules.md) | Engineering non-negotiables (the long form of AGENTS.md). |
| [Deployment.md](Deployment.md) | Production deploy guide (Vercel + Neon + LiveKit + Razorpay + Resend + realtime host). |

## Design
| Doc | What it is |
|---|---|
| [Design.md](Design.md) | The shipped design system — fonts, colors, spacing, motion. Read before any UI change. |
| [designs/](designs/) | Per-feature design briefs: care subscription, triage+booking flow, medical vault, launch-readiness. |

## QA / launch (pre-production)
| Doc | What it is |
|---|---|
| [qa/PreProductionTestPlan.md](qa/PreProductionTestPlan.md) | Functional test-execution backlog (Jira `SCRUM`). |
| [qa/ProductionReadinessBacklog.md](qa/ProductionReadinessBacklog.md) | Regulatory/clinical/privacy/security/ops readiness (Jira `MFPR`). |
| [qa/jira-import.csv](qa/jira-import.csv) · [qa/jira-import-readiness.csv](qa/jira-import-readiness.csv) | Bulk-import sources for the two Jira spaces (`scripts/jira-import.py`). |

## archive/ (historical — not current)
Finished execution plans and old-repo references, kept for provenance only:
`MobileAppPlan.md`, `UIUXRedesignPlan.md`, `ImplementationPlan.md`,
`FigmaDesignBrief.md`, `v1-feature-inventory.md`, `v1-ui-flows.md`.

---
Repo-level: [AGENTS.md](../AGENTS.md) (agent/contributor guide) · [../TODOS.md](../TODOS.md) (deferred work log) · [../README.md](../README.md).
