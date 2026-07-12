# MediFlow v2 — Telehealth Production-Readiness Backlog

Last updated: 2026-07-13 · Companion import file: [`jira-import-readiness.csv`](./jira-import-readiness.csv)

This backlog is **separate from the functional QA cycle** (`SCRUM` project). It captures
everything a *teleconsultation healthcare service* must verify before going to production
that is **not** "does the feature work" — regulatory, medico-legal, privacy, clinical
safety, security hardening, payments/finance, video quality, notifications reach,
accessibility, operations, and interoperability.

Scope note: MediFlow (single-doctor, India, ₹/Razorpay/Asia-Kolkata) is governed primarily
by the **Telemedicine Practice Guidelines 2020 (NMC/BoG)** and the **Digital Personal Data
Protection Act 2023 (DPDP)**. Global scale would add HIPAA (US) / GDPR (EU).

> ⚠️ **Not legal or clinical advice.** Items tagged `legal` / `clinical` require sign-off
> from a healthcare lawyer and the practising RMP. This backlog tells you *what to verify*;
> it does not certify compliance.

---

## Conventions

- **Project:** a new space (e.g. key `MFPR` — "MediFlow Production Readiness"), kept separate
  from `SCRUM` so compliance/ops work doesn't muddy the test-execution sprint.
- **Issue types:** one `Epic` → `Task` per readiness item.
- **Discipline** (who owns it — recorded on each item): `Legal` · `Clinical` · `Security` ·
  `Privacy` · `Payments/Finance` · `Eng` · `Ops` · `UX` · `Product`.
- **Gate level** (label + priority):
  | Label | Priority | Meaning |
  |---|---|---|
  | `legal-blocker` | P0 | Cannot lawfully operate without it |
  | `launch-blocker` | P0/P1 | Security/reliability risk too high to launch |
  | `recommended` | P2 | Strongly advised for a credible v1 |
  | `future` | P3 | v1.5+ / scale; documented, not done now |
- **Definition of done:** each item is `Done` only with **evidence** attached (signed
  document, config screenshot, policy URL, scan report, test result, or a written decision
  to defer with rationale).

---

## A. Regulatory & Medico-legal  *(Telemedicine Practice Guidelines 2020)*

| ID | Item | Discipline | Gate | MediFlow today |
|---|---|---|---|---|
| A1 | Display doctor's **RMP registration number + qualifications** on profile & at point of consult | Legal | legal-blocker | ❌ profile lacks reg number |
| A2 | **Prescription drug restrictions** — block controlled substances / Schedule X / narcotics via teleconsult; enforce List O/A/B rules & refill limits | Clinical+Eng | legal-blocker | ❌ free-form medicine list, no schedule guard |
| A3 | **Digitally-signed prescription** in a legal, verifiable format | Legal+Eng | launch-blocker | ⚠️ structured + locked, no signature |
| A4 | Informed **teleconsultation consent** — auditable, versioned, per consult (verify coverage & wording) | Legal | legal-blocker | ✅ versioned consent (verify wording is compliant) |
| A5 | **Patient identity verification** at first consult (name/age/ID per guidelines) | Legal+Clinical | recommended | ⚠️ profile fields only |
| A6 | **Minor patients** — guardian identity + consent flow | Legal+Clinical | recommended | ❌ |
| A7 | **Medical-records retention** policy (statutory period) + enforced purge afterwards | Legal | recommended | ❌ no retention policy |
| A8 | **Refund & cancellation policy** published and enforced in-product | Legal+Payments | legal-blocker | ❌ refund undecided |
| A9 | **Grievance redressal / Data Protection Officer** contact published (DPDP) | Legal | legal-blocker | ❌ |
| A10 | Practitioner **escalation-to-in-person/emergency** duty expressed in-flow | Clinical+Legal | recommended | ⚠️ triage warns only |
| A11 | **ToS / Privacy / Refund** documents legally reviewed & current | Legal | legal-blocker | ⚠️ pages exist; legal review unknown |
| A12 | Cross-jurisdiction / doctor-licensing-vs-patient-location policy | Legal | future | ❌ |

## B. Data Privacy & Protection  *(DPDP 2023 / GDPR / HIPAA)*

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| B1 | **Signed DPA/BAA** with every processor: LiveKit, Razorpay, Resend, Neon (DB), realtime host, Sentry | Legal+Security | legal-blocker | ❌ |
| B2 | **Encryption at rest** verified for DB + report/chat attachments | Security | launch-blocker | ⚠️ Neon default; bytea attachments |
| B3 | **Data localization** — health data stored in India (or documented lawful basis) | Legal+Security | recommended | ⚠️ Neon Singapore region |
| B4 | **PHI access audit trail** — who viewed which record/Rx/report, when | Security | recommended | ❌ pino logs ≠ access audit |
| B5 | Data-subject **rights**: access / export / erasure workflow | Legal | recommended | ❌ |
| B6 | **Breach detection + notification** process (DPDP timelines) | Security+Legal | recommended | ❌ |
| B7 | Data **retention/minimization** + scheduled purge job | Privacy | recommended | ❌ |
| B8 | **No PHI/PII in logs**, Sentry events, or analytics (scrubbing verified) | Security | launch-blocker | ⚠️ unverified |
| B9 | Data-processing **consent** captured & withdrawable | Legal | recommended | ⚠️ |

## C. Clinical Safety

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| C1 | Red-flag triage + **"not for emergencies"** disclaimer present on every entry point (verify) | Clinical | recommended | ✅ verify completeness |
| C2 | Documented **escalation pathway** to ER / in-person | Clinical | recommended | ❌ |
| C3 | **Drug allergy + interaction** check at prescribing | Clinical | recommended | ❌ |
| C4 | **Scope-of-care limits** — conditions unsuitable for teleconsult surfaced | Clinical | recommended | ❌ |
| C5 | Continuity of care / **referral / handoff** mechanism | Clinical | future | ❌ |
| C6 | **SOAP mandatory** before an Rx can be issued (verify enforced) | Clinical+Eng | recommended | ⚠️ verify |

## D. Identity & Access

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| D1 | Patient **identity capture** (KYC-lite) | Security+Legal | recommended | ⚠️ |
| D2 | Doctor **credential verification** & storage | Security+Legal | recommended | ❌ |
| D3 | **MFA** option (especially the doctor account) | Security | recommended | ❌ |
| D4 | **OTP brute-force / rate-limit / expiry / lockout** | Security | launch-blocker | ⚠️ verify Better Auth defaults |

## E. Security (technical)

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| E1 | External **penetration test / security review** | Security | launch-blocker | ❌ |
| E2 | **Dependency / SCA scanning** + patch process | Security+Eng | recommended | ❌ |
| E3 | **Secrets management** + key-rotation policy | Security | recommended | ⚠️ env vars |
| E4 | **Rate limiting / WAF / DDoS** protection | Security | recommended | ❌ |
| E5 | **Upload validation + malware scan** (reports + chat attachments) | Security | launch-blocker | ⚠️ type check only |
| E6 | **Security headers** (CSP, HSTS…) + secure/HttpOnly/SameSite cookie flags | Security+Eng | launch-blocker | ⚠️ verify |
| E7 | **Backups + disaster recovery** tested; RTO/RPO defined | Ops+Security | launch-blocker | ⚠️ Neon default, untested |
| E8 | **Video privacy** stance — access control (✅ token+window) + recording-consent policy | Security+Legal | recommended | ✅ access; ❌ recording policy |

## F. Payments & Finance

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| F1 | **GST / tax-invoice** compliance on fees (consult exempt; platform fee may not be) | Payments+Legal | recommended | ⚠️ receipt exists |
| F2 | Doctor **payout / settlement / reconciliation** process | Payments | recommended | ❌ |
| F3 | **Chargeback / dispute / refund-fraud** handling | Payments | recommended | ❌ |
| F4 | **Payment-failure reconciliation runbook** (webhook vs client callback edge cases) | Eng+Ops | recommended | ⚠️ |
| F5 | **PCI-DSS scope** confirmation — no card data touches our servers | Security | launch-blocker | ✅ Razorpay-hosted; document it |

## G. Video / Telecom Quality

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| G1 | **Poor-network resilience / reconnection** tested (low bandwidth, 3G, packet loss) | Eng | recommended | ⚠️ |
| G2 | **Fallback when video fails** — audio-only / phone / chat | Eng+Clinical | recommended | ❌ |
| G3 | **Call-quality monitoring** & metrics | Ops | future | ❌ |

## H. Notifications & Engagement

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| H1 | **SMS + WhatsApp** channel for OTP / reminders / confirmations (India reach; email alone underperforms) | Eng+Product | recommended | ❌ email only |
| H2 | **Communication consent + opt-out** | Legal | recommended | ❌ |
| H3 | **Reminder dedup** + delivery monitoring | Eng | recommended | ⚠️ |

## I. Accessibility & Inclusivity

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| I1 | **WCAG 2.1 AA audit** — keyboard, screen reader, contrast | UX | recommended | ⚠️ reduced-motion only |
| I2 | **Multilingual / localization** plan | UX+Product | future | ❌ |
| I3 | **Low-bandwidth / elderly / low-literacy** UX | UX | future | ❌ |

## J. Operations & Reliability

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| J1 | **Uptime monitoring + alerting + on-call** | Ops | launch-blocker | ❌ |
| J2 | **Observability** verified — Sentry + logs + metrics, no PII | Ops | recommended | ⚠️ Sentry wired |
| J3 | **Staging environment + rollback runbook** | Ops+Eng | recommended | ⚠️ |
| J4 | **Support / helpdesk** + SLA | Ops+Business | recommended | ❌ |
| J5 | **Analytics & reporting** (clinical + business) | Ops | future | ❌ |
| J6 | **Incident-response runbook** (incl. breach) | Ops+Security | recommended | ❌ |
| J7 | **Cost / scale monitoring** | Ops | future | ⚠️ |

## K. Interoperability (scale / future)

| ID | Item | Discipline | Gate | Today |
|---|---|---|---|---|
| K1 | **ABDM / ABHA** health-ID integration assessment (India national digital health) | Product | future | ❌ |
| K2 | **FHIR / HL7 / EHR** export standard | Eng | future | ❌ |
| K3 | **e-pharmacy / diagnostics-lab** integration | Product | future | ❌ |
| K4 | **Insurance / claims** integration | Product | future | ❌ |

---

## Production-readiness exit gate

Do **not** go to production until:

1. **All `legal-blocker` items are `Done` with evidence** (A1, A2, A4, A8, A9, A11, B1) — these are legal preconditions to operating, not features.
2. **All `launch-blocker` items are `Done`** (A3, B2, B8, D4, E1, E5, E6, E7, F5, J1).
3. Every `recommended` item is either done or has a **written, dated deferral decision** with an owner and target.
4. `future` items are logged (this backlog) so they aren't rediscovered as surprises at scale.

Total: 1 epic + 64 readiness tasks across 11 domains.
