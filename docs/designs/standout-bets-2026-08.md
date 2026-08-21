---
status: IDEATION — strategic bets, deliberately not effort-scored. None decided.
---
# Standout Bets — Business-Model-Level Ideas

Authored 2026-08-11. Different bar than
[feature-ideas-2026-08.md](feature-ideas-2026-08.md), which optimized for
cheap-and-proven. This round: founder explicitly asked to ignore effort and
find ideas unique enough to be their own business, not polish.

## Method — and the two failure patterns that bound it

Still evidence-first — bold doesn't mean uncritical, and two of the clearest
precedents found in this research are billion-dollar collapses, not wins.
Those come first, because they set the boundary for what "bold" should not
mean here, the same way graveyard cases (Google Health, Microsoft
HealthVault) disciplined the Vault Share research.

**Babylon Health** — raised to a $4.2B valuation on the claim that its AI
chatbot diagnosed better than real doctors, including a specific claim its
AI beat the average human doctor on a medical exam. Regulators and clinicians
found the AI's diagnostics inconsistent with accepted medical standards;
credibility collapsed, NHS contracts were dropped, US expansion failed,
bankruptcy followed within 18 months of going public. Root cause named
directly in the retrospectives: **it prioritized hype over trust, and
claimed the AI could replace clinical judgment.**

**Forward Health** — raised $657M (including a late $100M round to build
"CarePods" — self-service diagnostic pods) on the premise that technology
could take humans out of primary care. Generated under $100M in total
revenue against that spend; self-service blood draws routinely failed;
patients got stuck in the pods; premium real estate in NYC/SF made the unit
economics impossible at $150/month. Shut down abruptly in late 2024/early
2025. Root cause named directly: **it removed the human relationship that
was the actual product.**

Neither failure is a reason to avoid AI or avoid ambition. Both are reasons
to reject any bet that (a) claims AI replaces the doctor's judgment, or (b)
removes the doctor from the relationship to cut cost. Every idea below keeps
a real doctor making real decisions, and none require Forward's mistake of
capital-heavy physical infrastructure.

## 1. Shortlist

| # | Bet | Evidence strength | Reuses existing infra | Uniqueness / moat | Business model | Verdict |
|---|---|---|---|---|---|---|
| 1 | eConsult Network — doctor-to-doctor async specialist opinions | Strong — multiple independent studies converge on the same range ($300–650/patient saved, 20% cost reduction, 74% drop in specialist visits) | Yes — `appointmentMode = async` already exists | High — no India consumer-telemedicine competitor builds the doctor-to-doctor side; works with one doctor today | B2B(2C): other doctors/clinics pay per opinion | **Top pick — build first** |
| 2 | Structured outcome-priced care programs (vertical bundling) | Strong at scale (Ro $598M run rate; Hims & Hers $1.48B rev, 69% growth; One Medical 8% cost savings, 33% fewer ER visits, $3.9B acquisition) | Partial — Care subscription schema exists, pricing/product shape needs rework | Medium — proven model, but crowded once generic; defensible only if built around a real doctor's real specialty, not a funnel | Bundled/program pricing, not per-visit | Biggest swing — needs a dedicated strategy call, not a build decision yet |
| 3 | AI conversational pre-consult intake, reframed as a capacity multiplier | Strong (Stanford: 7 min/patient saved; 60–80% front-desk time reduction; 20–35% no-show improvement) | Yes — extends the existing booking intake step, pairs with the planned AI scribe | Medium — many players build generic AI intake; the differentiated angle is framing it as solo-doctor revenue capacity, not UX polish | Indirect: more consults per fixed day = direct revenue multiplier | Strong complement to existing roadmap — reprioritize |
| 4 | "MediFlow Verified" — cryptographically verifiable health credentials | Emerging but real — first healthcare verifiable credentials ever issued in May 2026 (TruMerit/Credivera); W3C standard finalized 2025; backed by a 2025–2026 White House/CMS initiative | Yes — reuses Vault Share's signing/envelope-encryption design directly | High — the category is weeks old; the early-mover window is open now | New B2B2C line: employers/insurers/institutions pay to verify | Sequence after Vault Share's crypto work lands |

## 2. Detailed picks

### 2.1 eConsult Network — doctor-to-doctor async specialist opinions

**What:** MediFlow's doctor (a specialist) accepts structured, async,
paid consult *requests from other doctors* — a GP who's unsure about a case
sends a structured question + the patient's data, gets a specialist opinion
back within hours, often avoiding a referral entirely. This is a B2B(2C)
product: the customer is another doctor or clinic, not a patient.

**Evidence — the strongest and most-replicated of anything found in this
research, across independent studies:** eConsults cost $226/consult versus
$587 for a traditional referral pathway — a $361 saving per patient. A
separate study found total costs declined $655 per patient versus
face-to-face referral. A 2019 study in the American Journal of Managed Care
found a 20% reduction in specialty-care costs overall. In-person specialist
visits dropped 74% in the first month after eConsult availability, and
time-to-first-specialist-contact improved over 16%.

**Why this is genuinely uncrowded, unlike Vault Share's mechanism:** every
consumer telemedicine competitor named in the earlier research — Practo,
1mg, Eka Care — is fighting for the same patient's attention, in the same
crowded 195-startup category. None of them are building the doctor-to-doctor
side. This isn't fighting over patient acquisition cost (the exact trap the
Ro/Hims research shows: "fast followers saturated the market, drove up CAC
in a race to the bottom"); it's a different customer entirely, with hard,
replicated cost-savings evidence behind it, and effectively no direct India
competitor building it as a product.

**Why it fits MediFlow specifically:** works **today**, with one doctor — a
GP anywhere could send MediFlow's doctor a case. It gets *more* valuable as
MediFlow goes multi-doctor (`doctor_profiles` is already modeled for this),
turning into a real specialist network, but doesn't need to wait for that.
It reuses the async infrastructure already in the schema
(`appointmentMode = async`) and doesn't require unwinding any existing
product decision — it's additive, a new revenue line sold to a different
buyer than the current product serves.

**The honest tension:** this only works if MediFlow's doctor is a specialist
worth paying for a second opinion — this is a bet on the doctor's own
credibility and specialty, not a generic platform feature. Worth confirming
that fit explicitly before building anything.

### 2.2 Structured, outcome-priced care programs — the biggest strategic swing

**What:** stop selling appointment slots as the unit of the product. Sell a
**bundled, structured program** around whatever the doctor's specialty
actually treats well — e.g., a 90-day structured diabetes or hypertension
program: initial consult, a fixed cadence of async check-ins, a self-logged
trend chart, medicine titration, education — priced as one bundle, not
per-visit.

**Evidence:** this is not speculative — it's the proven shape of the
biggest wins in this entire research pass. Ro grew from $185M to a $598M
revenue run rate in one year. Hims & Hers hit $1.48B revenue in FY2024, up
69%, with $126M net income. Calibrate grew 54% month-over-month with members
independently verified to hit 10%+ weight loss. One Medical's membership
model — the version of this closest to MediFlow's actual position — proved
it clinically too: 8% lower total healthcare cost per member, 33% fewer ER
visits, 90% consumer retention, which is why Amazon paid $3.9B for it.
Bundled/episode pricing generally shows 15–45% cost savings in the broader
literature, and Medicare's own mandatory bundled-payment model (TEAM) starts
in 2026 — the entire industry is moving toward paying for outcomes, not
visits.

**Why this is the boldest, not the safest, pick:** the same research
flagged the trap directly — "fast followers came in, saturated the market,
drove up CAC in a race to the bottom" once Ro/Hims proved the generic DTC
model worked. **The defensible version isn't a generic vertical funnel;
it's a program built around a real doctor's real specialty and an ongoing
relationship**, which a low-trust CAC-driven competitor can't easily copy
without also having the doctor and the trust. This is the one idea on this
list that is a genuine business-model change, not a feature — it likely
means rethinking MediFlow Care's current "one plan, not tiers" shape rather
than sitting beside it unchanged. Flagging that honestly rather than
pretending it's a bolt-on.

### 2.3 AI conversational pre-consult intake — reframed as a capacity multiplier, not a UX nicety

**What:** replace the static "visit reason + symptoms text box" at booking
with a short AI-driven conversational intake that asks real follow-up
questions like a resident taking a history, and hands the doctor a
structured case brief before the call starts.

**Evidence:** a Stanford study found AI chatbot intake in primary care saved
an average of **7 minutes per patient**. Broader 2026 adoption data shows
60–80% reductions in front-desk intake-handling time and 20–35% improvement
in no-show rates when appointment prep is integrated into the intake itself.

**Why this deserves bold framing, not just a UX line item:** a solo doctor's
day has a hard ceiling — a fixed number of hours. Nothing about patient
acquisition changes that ceiling. **A 7-minute-per-consult reclaim, multiplied
across a full day of bookings, is a direct increase in how many patients one
doctor can see without working longer** — the single highest-leverage lever
available for a one-doctor business's revenue ceiling, more than any
patient-facing feature on either list so far. It also strengthens the
already-planned AI scribe (`feature-ideas-2026-08.md` §2.4) rather than
competing with it — structured intake in, structured note out, same
pipeline.

**Guardrail, learned directly from Babylon:** this drafts a case brief for
the doctor to read — it does not diagnose, triage-decide, or represent
itself as clinical judgment. That line is what separates this from
Babylon's failure mode, and it's also already India's actual legal
requirement (Telemedicine Guidelines 2020 — the doctor authors and signs).

### 2.4 "MediFlow Verified" — cryptographically verifiable health credentials

**What:** issue the doctor's prescriptions, diagnoses, and fitness/health
certificates as cryptographically signed, instantly verifiable digital
credentials — not just a PDF, a tamper-evident artifact an employer,
insurer, school, or airline can verify in seconds without calling anyone.

**Evidence this is a real, current category, not speculative:** in May
2026, TruMerit issued the first verifiable digital credentials for
healthcare professionals via Credivera. Over 60 companies are adopting this
model as part of a White House/CMS-backed initiative running 2025–2026,
specifically naming diagnoses, allergies, vaccination records, and
prescriptions as the kinds of health data suited to this format. The
underlying W3C Verifiable Credentials standard finalized in 2025. This is
weeks-to-months old, not an established market — which is exactly the
window where being early matters.

**Why this fits MediFlow better than almost anyone else in this research
could claim:** the cryptographic signing/envelope-encryption work is
**already being designed** for Vault Share (see `vault-share-trd.md` §5) —
this is the same primitive pointed at a new problem, not new
infrastructure. It also directly extends the existing forwardable-Rx-QR work
already accepted in `launch-readiness-and-expansion.md` (item 5) —
today that's a viewable link; a verifiable credential is the same idea made
cryptographically provable rather than merely accessible. India-specific
angle: employers and schools routinely demand "fitness certificates,"
insurance claims require verified diagnosis documentation — a real,
recurring, currently-manual paper process this could replace directly,
opening a B2B2C revenue line (employers/insurers pay to verify) distinct
from consultation revenue entirely.

**Honest tension:** value only exists once *receivers* (employers, insurers)
are willing to trust and check a MediFlow-issued credential — a two-sided
adoption problem, same shape as any verification network. Worth sequencing
after Vault Share's signing infrastructure exists, since it's a genuine
reuse rather than a parallel build.

## 3. Explicitly rejected, even with effort off the table

- **Health-data marketplace ("get paid for your data")** — no strong
  evidence surfaced of this working at consumer scale, real DPDP consent-
  and re-identification-risk complexity on top of what Vault Share already
  carries, and it cuts against the trust positioning the whole product is
  built on. Not pursued further without real evidence it works somewhere.
- **Physical devices / kiosks / "remove the human"** (the Forward Health
  shape) — explicitly rejected per the Method section, regardless of budget.
- **AI system that diagnoses or triages autonomously** (the Babylon shape)
  — explicitly rejected per the Method section, and already precluded by
  India's Telemedicine Guidelines 2020 requirement that a doctor authors and
  signs.

## 4. If forced to pick one

**The eConsult Network (§2.1).** It has the hardest, most independently
replicated evidence of anything in either research pass — several separate
studies landing in the same $300–650-per-patient-saved range is a strength
no single-study finding here can match. It's genuinely uncrowded in India —
nobody named in this research is building the doctor-to-doctor side of this
market. It works today with exactly the one doctor MediFlow has, without
waiting on multi-doctor. It's additive, not a rework of anything already
decided. And it fails safely in both directions Babylon and Forward didn't:
it's a real doctor's real judgment, delivered faster — nothing about it
claims AI replaces a clinician, and nothing about it requires a single
square foot of real estate.

The care-program bundling idea (§2.2) is the bigger and, if it works,
probably more valuable swing — but it's a strategic pivot on pricing and
product shape, not a feature to greenlight in this conversation. Worth its
own dedicated founder discussion (and, if it survives that, its own
PRD/TRD/business trio the way Vault Share got) before committing engineering
time.

---

## Sources

- [Babylon Health: the failed AI wonder app that 'dazzled' politicians — The Week](https://theweek.com/health/babylon-health-the-failed-ai-wonder-app-that-dazzled-politicians)
- [Babylon Health: A $4.2B Digital Health Failure Case Study](https://haverin.substack.com/p/babylon-health-digital-health-failure-case-study)
- [Why Forward Health Failed: Lessons for Tech-Driven Primary Care](https://www.healthcarehuddle.com/p/why-forward-health-failed-lessons-for-tech-driven-primary-care)
- [Primary care player Forward shuts down — Fierce Healthcare](https://www.fiercehealthcare.com/health-tech/primary-care-player-forward-shutters-after-raising-400m-rolling-out-carepods)
- [Reduced Cost Of Specialty Care Using Electronic Consultations for Medicaid Patients — Health Affairs](https://www.healthaffairs.org/doi/10.1377/hlthaff.2018.05124)
- [The Benefits of eConsults: Literature Review — RubiconMD](https://www.rubiconmd.com/exploring-the-top-5-benefits-of-econsults-literature-review/)
- [An eConsultant versus hospital-based outpatient consultation — costing analysis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10174616/)
- [eConsults Can Lower Costs and Improve Access to Specialty Care — Mathematica](https://www.mathematica.org/news/econsults-can-lower-costs-and-improve-access-to-specialty-care)
- [Ro and the telehealth capital cycle — Sacra](https://sacra.com/research/ro-telehealth-capital-cycle/)
- [Hims & Hers Health — Business & Moat Analysis](https://koalagains.com/stocks/NYSE/HIMS/business-and-moat)
- [One Medical Bought Out by Amazon in $3.9B Deal — Fierce Healthcare](https://www.fiercehealthcare.com/health-tech/amazon-shells-out-39b-primary-care-startup-one-medical)
- [Amazon-One Medical One-Year Follow-Up Report — Oregon HPA](https://www.oregon.gov/oha/HPA/HP/HCMOPageDocs/005-Amazon-OneMedical-1-Year-Follow-Up-Report.pdf)
- [What Are Bundled Payments? — NEJM Catalyst](https://catalyst.nejm.org/doi/full/10.1056/CAT.18.0247)
- [Bundled Payments Saved Money for Outpatient Surgeries — Penn LDI](https://ldi.upenn.edu/our-work/research-updates/surprising-result-bundled-payments-saved-money-for-outpatient-surgeries/)
- [Digital health funding concentrates in fewer startups — Healthcare Dive](https://www.healthcaredive.com/news/digital-health-funding-concentrates-fewer-startups-q1-2026-rock-health/816777/)
- [Conversational AI for Clinical Intake — Feasibility and Acceptability Pilot Study](https://www.sciencedirect.com/science/article/pii/S294976122600057X)
- [AI Medical Intake in 2026 — Perspective AI](https://getperspective.ai/blog/ai-medical-intake-in-2026-how-practices-are-replacing-clipboards-with-conversational-forms/)
- [TruMerit and Credivera Issue First Verifiable Digital Credentials for Healthcare Professionals](https://www.trumerit.org/trumerit-and-credivera-issue-first-verifiable-digital-credentials-for-global-healthcare-professionals/)
- [Verifiable Credentials in Healthcare — No World Borders](https://amp.noworldborders.com/2026/06/16/verifiable-credentials-in-healthcare/)
- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/2025/CRD-vc-data-model-2.0-20250126)
