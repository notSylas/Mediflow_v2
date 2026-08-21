---
status: DRAFT — market research + business analysis, for founder review
---
# Vault Share — Business Plan

Authored 2026-08-11, revised same day after a second research pass
specifically on prior art and live-market track record (patents, and whether
comparable products actually work). Companion to
[vault-share-prd.md](vault-share-prd.md) and
[vault-share-trd.md](vault-share-trd.md). Full source list at the bottom.

## 1. Executive summary

The founder's instinct — a generic, hospital-agnostic, patient-owned,
encrypted, shareable prescription vault — is directionally right, and matches
what `PRODUCT.md` already bet the whole product moat on. The underlying pain
is real and well-evidenced (§5). But two things need to be said plainly
before this goes further, because the founder asked for honesty over
enthusiasm:

1. **This mechanism is not novel.** OTP/code-gated, time-limited, encrypted
   access to a patient's own health records has been independently patented
   at least since 2011, is live today in Epic MyChart (US hospitals) and Eka
   Care (India), and is the literal design of ABDM's own consent-manager
   layer. There is no version of this pitch that wins on "nobody's done this
   before." §2 covers this in full, including a genuine freedom-to-operate
   flag that needs real legal review, not a web search.
2. **The category has a well-documented graveyard**, and the two biggest
   corpses — Google Health and Microsoft HealthVault — were built by
   companies with vastly more resources than are available here, and died of
   the same root cause: a stand-alone vault that depended on patients
   manually feeding it. §2 also covers why this matters enormously for which
   *parts* of the founder's idea are safe to build and which aren't.

Net effect on the recommendation from the first draft of this document: **Tier
1 (auto-capture) is a clear, low-risk build — do it regardless of anything
below.** The "anywhere share" mechanism (Vault Share / Flow A) is sound
*engineering* but should ship as a small, cheaply-validated bet, not as the
headline story pitched to press or investors. Tier 2 (manual upload of old
paper records) is the piece structurally closest to what killed Google Health
and HealthVault, and should wait for real usage evidence from the first two
before further investment. This is a more cautious sequencing recommendation
than the first draft of this document gave — the evidence below is why it
changed.

## 2. Reality check — prior art and live comparable products

### 2.1 Patent landscape — a genuine flag, not a formality

A search of granted patents surfaced multiple filings directly on-point:

- **US 12183441** — *"Apparatus, System and Method for Patient-Authorized
  Secure and Time-limited Access to Patient Medical Records Utilizing Key
  Encryption"* — a very recent grant (2024/2025-era patent number), and the
  title alone describes almost exactly the Vault Share mechanism in the TRD
  (patient-authorized, time-limited, key encryption). This is the single
  most important finding of this research pass.
- **US 8090590B2** (2011-era) — a patient generates a temporary ID/password
  for another person, valid until a date, a count of uses, or indefinitely —
  functionally the OTP-share-code idea, patented over a decade ago.
- **US 10535020 / US 10789555** — mobile-device, time-limited consent to
  transfer health records to a provider.
- **US 20150213195A1** — patient-authorized content-, function-, and
  time-specific record access permissions.
- Several blockchain-based consent-management patents (e.g. **CN112349368A**)
  covering a different mechanism but the same problem space.

**What this means, honestly:** I am not a patent attorney, and a title match
on a web search is not a freedom-to-operate opinion — claims, not titles,
determine infringement, and none of these were read in claim-level detail
here. What can be said responsibly: this exact problem space has been
patented repeatedly across 15 years by unrelated filers, in at least the US
and China. That cuts two ways. It means **a real patent-counsel FTO review is
a genuine dependency before this ships at any meaningful scale** — not
optional due diligence, an actual task with a cost and a timeline. It also
means the mechanism is now closer to industry-standard practice than to a
defensible invention — which matters for the business case: **this was never
going to be protectable IP**, so the business plan should stop implicitly
leaning on "we built something proprietary" and lean entirely on execution
and the consult-loop tether (§2.3), which is the actual differentiator.

### 2.2 The graveyard: Google Health and Microsoft HealthVault

Both are directly on-point precedent, not tangential:

- **Google Health** (2008–2011). Shut down after roughly three years. Root
  causes identified across multiple retrospectives: adoption never crossed
  from a niche of tech-savvy/caregiver users into daily mainstream habit;
  the healthcare system's fragmentation meant there was often nothing to
  import (many providers had no electronic records to pull from at all);
  general consumer trust/privacy hesitation toward a large tech company
  holding health data; and a persistent gap between the product's design and
  the on-the-ground reality of how care actually gets delivered.
- **Microsoft HealthVault** (2007–2019). Survived over a decade longer than
  Google Health, still shut down. The retrospectives converge on one
  specific root cause above the others: **it was a stand-alone system that
  depended on motivated patients entering their own data, never properly
  tethered into the EHRs doctors and hospitals actually used.** Limited
  wearable/device integration and weak sharing capability compounded it.

Both are named in the same breath in most of the retrospective literature —
"lessons from the failure of stand-alone PHRs" is a category-level finding,
not a company-specific one.

### 2.3 What actually survives: tethered beats stand-alone

The pattern separating survivors from the graveyard is consistent across the
research: **products where the health record is a byproduct of something the
patient was already doing survive; products that ask the patient to
independently maintain a health record as its own destination don't.**

- Apple Health Records and CommonHealth survive by riding OS-level
  distribution (every iPhone/Android device already has the platform
  installed) and by pulling structured data automatically once linked — the
  patient doesn't hand-type their own labs.
- Epic's Share Everywhere and MyChart survive because they're generated from
  data a hospital's EHR already captured during an actual visit — the
  patient never had to build the record, only share it.
- Google Health and HealthVault died specifically where they asked the
  patient to be the data-entry engine, with no natural trigger forcing them
  back to the app.

This is the single most useful finding for MediFlow's own roadmap, because
**MediFlow's Tier 1 (auto-capture from every consult) already matches the
survivor pattern exactly**, and was designed that way independent of this
research — it rides the real, paid, recurring consult loop, not a separate
"please maintain your health record" ask. Tier 2 (manually photograph and
upload an old paper prescription) is, structurally, the pattern that killed
the two biggest names in this category: it depends on a motivated patient
doing unprompted, unrewarded data entry with no immediate clinical trigger.
That doesn't mean don't build it — it means don't bet the differentiation
story on it, and validate real usage before investing further (§10).

### 2.4 Closest live competitors, honestly assessed

The first draft of this document listed competitors by feature set. Feature
parity isn't the same as working well — here's what the actual user-facing
evidence shows:

- **Eka Care** — real app-store and review evidence from 2026 shows a mixed
  picture, not a smooth success story: user complaints about premium
  features not unlocking after payment, refund disputes, some users
  explicitly calling it "a scam" in reviews (company says the underlying bug
  was fixed), and doctors split — some praise the UI, others advise against
  paying for it or warn about subscription-renewal practices. **Read
  correctly, this is reassuring, not just threatening**: the closest funded
  direct competitor doing almost this exact mechanism has not solved trust
  and execution either. It's proof the mechanism works technically, and
  proof that shipping it well is still an open, winnable problem.
- **DigiLocker** — the 500M+ user figure cited in the first draft is
  DigiLocker's *entire* document-storage user base (IDs, certificates,
  licenses, everything), not specifically active health-records users — that
  distinction was blurred in the first draft and should be corrected.
  Independent research on DigiLocker adoption broadly (not health-specific)
  points to real, unresolved barriers: low digital literacy, security
  concerns, and usability issues limiting how much of the nominal user base
  is genuinely active, let alone active specifically on health records.
- **ABDM, on the ground in 2026** — the mandate and infrastructure are real
  (§7), but the lived experience has real friction: most patients don't know
  their own ABHA ID and clinics end up generating it during the visit
  itself; a facility can have an ABHA linked in its system while still not
  functionally exchanging records over ABDM ("linked the ID but not actually
  using ABDM" is called out explicitly in industry commentary); and
  poorly-built integrations cause real disruption. The competitive pressure
  pushing clinics to comply is real and growing — but the rails themselves
  are not yet the frictionless, mature system a press release makes them
  sound like.

### 2.5 Category density — this is a crowded field

India has an estimated **195 personal health record startups** (Tracxn,
2026) — the second-largest PHR startup market in the world after the US.
This materially changes the honest competitive read from the first draft,
which named two direct comparators. This is not a two-horse race; it's a
crowded, low-differentiation category where most entrants compete on
overlapping feature lists. "We have an encrypted, shareable health vault" is
not, by itself, a claim that stands out in this market — nearly every
competitor in that list can say the same sentence.

## 3. Market sizing — read the numbers with the right caveat

Global personal health record (PHR) software is estimated at **USD 12.96
billion in 2026, growing to USD 28.86 billion by 2035 (≈9.2% CAGR)**, with
Asia-Pacific — India specifically named — called out as the fastest-growing
region. Real and growing, but a top-down global software-market figure, not
an India-specific or vault-specific number, and — per §2.5 — a number that
has to be read against 195 India competitors already chasing it, not as a
gap waiting to be claimed.

The more useful number for MediFlow right now is **attach rate within
MediFlow's own existing and planned patient base**, since v1 remains
single-doctor. Treat this feature as a retention and differentiation lever
inside the existing roadmap, not a standalone market entry.

## 4. Competitive landscape

| Player | What it actually is | Reach / scale | Relevant gap for MediFlow |
|---|---|---|---|
| **ABDM + DigiLocker** | India's government digital health rail — ABHA health ID, Health Information Provider network, federated consent-manager layer (HIE-CM); DigiLocker is the consumer PHR app on top. | ~86.64 crore ABHA accounts, ~90.70 crore linked records (Mar 2026); mandatory for all hospitals by 2027. | Free, and structurally similar. Depends on the *originating facility* being ABDM-integrated (only ~2.56 lakh facilities actively using ABDM software as of Mar 2026 — a small fraction of India's hospitals and a much smaller fraction of solo/small-practice doctors). Real on-the-ground friction even where it is rolled out (§2.4). |
| **Eka Care** | India PHR + EMR/EHR app already shipping a "consent PIN" mechanism close to the founder's original description, plus AI health chat and booking. | Established, funded, actively building on ABDM rails. | Closest direct competitor, not hypothetical — and not executing flawlessly either (§2.4). Differentiation has to be depth of clinical structuring and the MediFlow consult loop, not the sharing mechanic in isolation, which isn't novel (§2.1). |
| **Practo / 1mg and similar aggregators** | Marketplace-first telemedicine/pharmacy apps with basic in-app prescription history. | Large user bases; records are a retention feature for their own marketplace. | Same incumbent-lock-in pattern `PRODUCT.md` already positions against. |
| **Epic "Share Everywhere"** (US, reference) | Share code + identity check → time-limited, view-until-logout access, no receiving-side account needed. | Epic is the dominant US hospital EHR vendor. | Not an India competitor, but the clearest proof this exact mechanism works at scale — and the clearest prior art (§2.1, §2.2). |
| **Apple Health Records / CommonHealth** (global, reference) | OS-level (iOS/Android) automatic clinical data aggregation with granular consent. | Rides existing device install base. | Survivor-pattern reference (§2.3) — automatic aggregation, not patient self-entry. |
| **Google Health / Microsoft HealthVault** (defunct, reference) | Stand-alone consumer PHR vaults, built by two of the largest software companies in the world. | Both shut down after years of investment (2011, 2019). | The cautionary precedent this entire section is built around (§2.2). |

## 5. Why trust is the actual product, not a feature of it

Two India healthcare breaches are directly relevant to how seriously this
feature's security posture needs to be taken:

- **Apollo Hospitals** — one of India's largest hospital chains — had a data
  leak exposing Aadhaar, PAN, passports, medical records, and internal login
  credentials.
- **Star Hospitals** — patient records found hosted on an open website,
  leading to a police case under IT Act and Bharatiya Nyaya Sanhita sections.

This validates the founder's original instinct ("not tied to a hospital
chain like Apollo") — but it also means Vault Share inherits an unusually
high bar: a breach of an aggregated, years-deep vault would be more damaging
to trust than losing any single record, because the pitch is explicitly
"safer than the alternative." The TRD's encryption architecture (envelope
encryption, crypto-shreddable deletion, KMS-audited key access) is sized to
that stakes level deliberately.

## 6. Regulatory landscape (DPDP Act 2023)

- Consent is the primary lawful basis for processing personal data under
  DPDP; valid consent must be free, specific, informed, and given through a
  clear affirmative action.
- A **"Consent Manager"** is a distinct, licensed role under the DPDP
  Rules — an independent company, minimum ₹2 crore net worth, registered
  with the Data Protection Board, relaying consent **across multiple data
  fiduciaries**.
- Rollout is phased: Data Protection Board constituted (Nov 2025), Consent
  Manager registration activates **Nov 2026**, full enforcement **May 2027**.
- **Implication:** Vault Share must stay on the "data fiduciary capturing
  direct consent for its own data" side of that line (TRD §10). MediFlow's
  launch window sits inside this phased rollout — build compliant from day
  one.

## 7. The timing tension — revised, more cautious than the first draft

The first draft leaned toward treating the ABDM 2027 mandate as a reason to
consider pulling the Vault Share MVP forward, ahead of `PRODUCT.md`'s
Phase 3 gate. Having now seen the graveyard evidence (§2.2) and the
competitive density (§2.5), that lean should be tempered, not reversed:

- The regulatory clock (§6) is real and slow-moving (months, not weeks) —
  it doesn't demand an immediate reaction.
- The far more immediate risk is **sequencing a differentiator feature
  ahead of validating the core product** — `PRODUCT.md`'s own honest status
  (§2, that file) records **zero real paid bookings** as of this writing.
  Betting build effort on a crowded, patent-thicketed, historically
  graveyard-prone feature category before the core single-doctor loop has
  proven itself with real patients is a real risk, independent of whether
  Vault Share itself is good.
- `PRODUCT.md` is explicitly authoritative on sequencing, and its existing
  discipline — gate Phase 3 behind validated scale — reads, after this
  research, as *more* correct than the first draft credited it, not less.

**Revised recommendation (at the time of writing):** Tier 1 proceeds on its
existing track regardless (cheap, safe, matches the survivor pattern, no
reason to wait on anything). A Vault Share MVP (Flow A only, TRD §11.4) is
worth keeping on the table as a cheap, small, real-user-validated bet once
the Phase 0 booking-validation gate is actually cleared — not before, and
not marketed internally as the product's moat. Tier 2 waits for usage
evidence from the first two.

**Decided 2026-08-11, overriding the above:** founder chose to build Vault
Share now, in parallel with the push for the first real bookings, rather
than wait for the gate. The risk this section names — investing in a
crowded, patent-thicketed category before the core product has real paying
patients — doesn't disappear because the timing changed; it's now a live
risk being carried deliberately rather than sequenced away. Worth revisiting
this specific tradeoff if the first bookings take meaningfully longer than
expected to materialize.

## 8. Monetization

Four models considered:

| Model | Verdict | Why |
|---|---|---|
| Bundle entirely into MediFlow Care (₹499/mo) | Partial fit | Reuses an already-validated billing surface, but Tier 1 needs to work for **every** patient, including one-off consult patients who never subscribe — gating "never lose a record" behind a subscription undercuts the retention moat it's meant to build. |
| Fully free | Rejected as the only model | Matches DigiLocker's price point but gives up a real monetizable behavior for no strategic reason. |
| Per-share fee | Rejected | Directly taxes the exact behavior — sharing with a new doctor — that makes the product valuable. |
| **Freemium (recommended)** | **Best fit** | Tier 1 and a reasonable number of Anywhere Shares stay **free for every patient**, unconditionally. Paid tier (bundled into Care, or standalone) unlocks unlimited Tier 2 uploads, unlimited shares, family profiles, deeper trend analytics. |

**Recommendation unchanged from the first draft:** freemium, free tier
generous enough that the trust-building layer never feels held hostage.

**Decided 2026-08-11:** pricing itself is deferred — build and ship access
open/ungated for now, choose the actual pricing model once there's real
usage to price against. The freemium shape above is the leading candidate
when that decision gets made, not committed yet.

## 9. Unit economics — directional only, not a committed number

- **KMS**: negligible per-user cost — API calls happen per share event, not
  per patient per month. The one real fixed cost is the managed key itself
  (roughly a dollar or two per month, cloud-provider dependent) — a platform
  cost, not a per-user one.
- **Storage**: cents per patient per year at this stage — not a pricing
  driver.
- **OCR/extraction**: the real unknown. Vendor marketing claims (99%+
  accuracy) say nothing about per-document pricing, and no vendor quote has
  been collected. **Do not set freemium upload limits before getting an
  actual quote.**
- **Patent/legal**: a new, real line item this revision adds — a proper FTO
  review before shipping the encryption/OTP mechanism at scale has a real
  cost that should be budgeted, not treated as free due diligence.
- **Directional read**: infra cost per active vault-share user is likely low
  relative to the ₹499/mo Care price point, provided OCR cost doesn't spike
  it and legal review is budgeted separately.

## 10. Go-to-market

1. **Now → Phase 0/1**: **decided 2026-08-11** — Vault Share's MVP slice
   (Flow A, TRD §11.4) is greenlit now, in parallel with the push for the
   first real bookings, overriding the wait-for-the-gate recommendation
   below. Ship Tier 1 regardless either way — it needs no new validation, it
   already matches the pattern that survives (§2.3).
2. **Gate on real bookings** (`PRODUCT.md`'s own Phase 0 gate — ~5 real paid
   bookings): only after this clears, run a cheap, small validation of the
   Vault Share MVP (Flow A, MediFlow-native records only) with real patients
   and a real receiving doctor — a paper-prototype or Wizard-of-Oz test
   before building the KMS/encryption machinery, given that even a funded
   competitor (Eka Care, §2.4) hasn't fully solved the trust/execution
   problem yet.
3. **Phase 2 (AI triage)**: Tier 2 becomes technically possible once the
   shared OCR pipeline lands — but per §2.3/§7, treat it as a
   measure-before-you-invest bet, not an assumed build.
4. **Phase 3 (continuity, per existing gate)**: full vault + Vault Share as
   a differentiator claim, but a modest one — "the thing that fills your
   DigiLocker automatically and makes it useful to a doctor in under a
   minute" is true and defensible; "we built something nobody else has" is
   not, and shouldn't be said to press or investors given §2.1/§2.5.

## 11. Risks

- **Regulatory misclassification** as a DPDP Consent Manager (§6, TRD §10).
- **Patent/FTO risk** — genuine, not hypothetical (§2.1). Needs real counsel
  before scaled shipment.
- **Breach severity asymmetry** — this feature aggregates more sensitive
  history behind a single artifact than anything else in the product (§5).
- **Category-level adoption risk** — not just competitive risk. The research
  in §2.2/§2.3 shows this exact product category has killed products from
  companies far better resourced than this one. That risk doesn't go away
  because MediFlow's version is better-designed; it means the parts of the
  design that don't match the survivor pattern (Tier 2 specifically) carry
  real, evidenced risk of low sustained usage even if initial adoption looks
  fine — PHR engagement research consistently shows usage peaks at adoption
  and declines from there.
- **Competitive reality, not blue ocean** — 195 India PHR competitors
  (§2.5), a funded direct competitor already shipping the core mechanism
  (§2.4), and a free government incumbent (§2.4) with a legal mandate
  behind it. Any pitch — internal, investor, or press — needs to be honest
  about this from the start.
- **Adoption is a two-sided friction problem** — the receiving doctor's "no
  login, no app" experience has to have zero real friction, or the "share in
  under 60 seconds" claim collapses on first contact. Needs real usability
  testing before it's trusted.
- **Regulatory clock** — DPDP Consent Manager registration activates Nov
  2026, full enforcement May 2027, inside MediFlow's plausible build window.

## 12. Honest verdict

Asked directly, as a straight opinion rather than a hedge: **the underlying
thesis is good; the version of it that gets pitched as "a hell of a good
business" on its own is not what the evidence supports.**

What's genuinely good: the pain is real (paper records, fragmentation, even
breaches at the incumbents people trust most). MediFlow's Tier 1 design —
auto-capture riding a real paid consult, not a separate app asking patients
to maintain a record — happens to already match the exact pattern that
separates the products in this category that survived from the two most
famous ones that didn't. That wasn't luck; it's the right structural call,
and it should ship without further debate.

What's overstated, in the founder's original framing and in my own first
draft of this business doc: that the OTP/encryption/sharing mechanism is a
novel, defensible idea, and that it constitutes the business. It's neither.
It's been patented repeatedly since 2011, it's live today at a real India
competitor with real (mixed) user reviews, and it sits in a market with 195
other companies making a similar pitch. Building it well is still a real,
winnable execution problem — but it's an execution problem in a crowded
field, not a first-mover land grab, and the pitch to investors or press
should say that, not the opposite.

My honest recommendation: build Tier 1 now. Treat Vault Share (Flow A) as a
disciplined, cheaply-validated feature — not as the reason MediFlow will win.
Hold Tier 2 until Tier 1 and Flow A produce real usage data, because it's the
one piece of this plan that structurally resembles the two biggest failures
in the category's history. That's a smaller, more boring plan than "portable
encrypted vault, the future of Indian healthcare records" — and it's the one
I'd actually bet on.

**Founder decision, 2026-08-11:** build Vault Share now rather than after the
booking gate. Noted, not relitigated — the sequencing risk above is now
being carried deliberately, not avoided. The rest of this verdict stands:
this is still execution in a crowded category, not a land grab, and Tier 2
still waits for real usage data regardless of when Flow A ships.

## 13. Success metrics (business-level, complements PRD §8)

- Vault-share adoption as a **retention** signal: do patients who create a
  vault or a share come back for a second MediFlow booking at a higher rate?
- **Usage decay, not just adoption** — measure at 90 and 180 days, not just
  at signup. PHR engagement research consistently shows usage peaks at
  adoption and declines from there (§2.2) — plan to see this curve, don't
  be surprised by it, and use it as the real signal for whether to invest
  further in Tier 2.
- Free-to-paid conversion rate, once freemium limits exist.
- Cost per active vault-share user (once real OCR pricing and legal-review
  cost are known) against Care ARPU or a standalone price point.
- Zero-breach track record — the one metric where "boring" is the only
  acceptable outcome (§5).

---

## Sources

- [Ayushman Bharat Crosses 90 Cr ABHA Accounts](https://organiser.org/2026/05/31/355992/bharat/ayushman-bharat-crosses-90-cr-abha-accounts-how-modi-govt-is-building-the-worlds-largest-digital-health-ecosystem/)
- [Hospital ABDM Integration India 2026 — ABHA, FHIR & DHIS](https://www.adrine.in/blog/hospital-abdm-integration-complete-guide-india-2026)
- [ABDM 2026 Rollout — What Every Indian Doctor + Clinic Must Do](https://ichelonconsulting.com/insights/abdm-2026-rollout-update-doctors-clinics-india)
- [ABDM Mandates Are Coming — Tatvacare](https://www.tatvacare.in/blog/abdm-mandates-are-coming-what-every-indian-clinic-needs-to-do-now/)
- [DigiLocker integrates digital health records storage, links to ABHA](https://ardorcomm-media.com/digilocker-integrates-digital-health-records-storage-and-links-them-to-abha/)
- [PIB: DigiLocker users can digitally store health records, link ABHA](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1874894)
- [Digi Locker — How much the youth is actually using it? (ResearchGate)](https://www.researchgate.net/publication/339460178_Digi_Locker_-Indian_Digital_Locker_How_much_the_youth_is_actually_using_it)
- [Apple: About the privacy and security of your health records](https://support.apple.com/en-us/111755)
- [Apple: Health app data — Share with Provider FAQ](https://support.apple.com/guide/healthregister/health-app-data-share-with-provider-faq-apd531bc6215/web)
- [Epic MyChart: Share your medical record](https://www.mychart.org/Sharing-Your-Medical-Record)
- [Epic: Share Everywhere FAQ](https://shareeverywhere.epic.com/FAQ)
- [Eka Care: Digital Health Locker benefits](https://www.eka.care/services/health-locker-and-its-benefits)
- [Eka Care: ABHA features for patients](https://www.eka.care/s/for-patients/abha-features)
- [Eka Care reviews — Software Advice](https://www.softwareadvice.com/medical/eka-care-profile/)
- [Eka: Health AI, ABHA, Records — App Store reviews](https://apps.apple.com/in/app/1561621558?see-all=reviews&platform=iphone)
- [Personal Health Record Software Market — ResearchNester](https://www.researchnester.com/reports/personal-health-record-software-market/6618)
- [Personal Health Record Software Market Report — Grand View Research](https://www.grandviewresearch.com/industry-analysis/personal-health-record-software-market-report)
- [Top Companies in Personal Health Records — Tracxn](https://tracxn.com/d/trending-business-models/startups-in-personal-health-records/__woOIlKZ_BJ7UopJFwy-jMfm4f_lonYSky7dXZrI4NZ4/companies)
- [Consent Managers under India's DPDP Act and DPDP Rules — AZB Partners](https://www.azbpartners.com/bank/consent-managers-under-indias-dpdp-act-and-dpdp-rules/)
- [India Data Privacy Laws: DPDP Act 2023 and DPDP Rules 2025 — Recording Law](https://www.recordinglaw.com/world-laws/world-data-privacy-laws/india-data-privacy-laws/)
- [PHI Encryption Standards for Data at Rest — Censinet](https://censinet.com/perspectives/phi-encryption-standards-data-at-rest)
- [Medical Prescription List OCR API — Veryfi](https://www.veryfi.com/medical-prescription-list-ocr-api/)
- [Healthcare data breach: Star Hospitals patients' records leaked — NewsMeter](https://newsmeter.in/hyderabad/healthcare-data-breach-tgcsb-registers-case-after-star-hospitals-patients-records-leaked-online-772895)
- [Hackers May Have Stolen Patient Data from India's Largest Hospital Chain — BOOM](https://www.boomlive.in/decode/hackers-may-have-stolen-patient-data-from-indias-largest-hospital-chain-28228)
- [US12183441 — Patent-Authorized Secure and Time-limited Access to Patient Medical Records Utilizing Key Encryption (USPTO)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12183441)
- [US8090590B2 — Electronic personal health record system (Google Patents)](https://patents.google.com/patent/US8090590B2/en)
- [US20150213195A1 — Electronic health records (Google Patents)](https://patents.google.com/patent/US20150213195A1/en)
- [What Was Google Health and Why Was it Discontinued? — Failory](https://www.failory.com/google/health)
- [How a Broken Medical System Killed Google Health — MIT Technology Review](https://www.technologyreview.com/2011/06/29/193325/how-a-broken-medical-system-killed-google-health/)
- [What The Failure of Microsoft's HealthVault Means for the Future of EHRs](https://hitconsultant.net/2019/04/19/what-the-failure-of-microsofts-healthvault-means-for-the-future-of-ehrs/)
- [Lessons from the failure of stand-alone PHRs — Practice Fusion](https://www.practicefusion.com/blog/lessons-from-failure-of-stand-alone/)
- [Barriers to Patient Engagement in Mobile Health Apps and Devices — Neura](https://medium.com/the-official-neura-blog/barriers-to-patient-engagement-in-mobile-health-apps-and-devices-7c4b30215388)
- [A Cross-Sectional Study of Barriers to Personal Health Record Use — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3282785/)
- [CommonHealth app — Cornell Chronicle](https://news.cornell.edu/stories/2019/09/app-lets-android-users-control-their-health-records)
