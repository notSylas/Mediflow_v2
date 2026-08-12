---
status: IDEATION — evidence-gathered proposals, none decided or scheduled yet
---
# Feature Ideation — Evidence-Backed Pass

Authored 2026-08-11. Not a committed plan — a filtered shortlist from a broad
market/evidence scan, done at the founder's request to find more standout
features beyond [Vault Share](vault-share-prd.md), using the same discipline
that research applied: evidence over hype, explicit rejects shown alongside
picks, fit against what MediFlow already has rather than a wishlist.

## Method

For each candidate: is there real published/market evidence it works (not
just that it sounds good), does it fit MediFlow's actual position (single
doctor now, India, cash-pay, existing schema/infra), and what's the honest
effort/risk. Ideas that failed this bar are listed in §3 with the reason,
not silently dropped — same standard applied to Vault Share's Tier 2.

## 1. Shortlist

| # | Idea | Evidence strength | Reuses existing infra | Effort | Verdict |
|---|---|---|---|---|---|
| 1 | Cancellation waitlist / auto-backfill | Strong, quantified | Almost entirely (hold/slot engine) | Low | **Build first** |
| 2 | "Quick Ask" — async low-acuity visits, open to any patient | Strong (store-and-forward literature) | Mostly (`appointment.mode=async` already exists) | Low–Medium | **Build second** |
| 3 | Audio-only / low-bandwidth call fallback | Strong, India-specific | Mostly (LiveKit supports this natively) | Low | **Build third** |
| 4 | AI ambient scribe — reprioritize existing v1.5 item | Strong, most-evidenced item in this whole pass | New (transcription pipeline) | Medium | Reconsider sequencing, not scope |
| 5 | Patient-friendly visit summary (rides #4) | Moderate, plausible extension of #4's evidence | New, but cheap once #4 exists | Low (after #4) | Pair with #4 |
| 6 | Caregiver / proxy booking for dependents | Strong, mature pattern | Partial (needs delegated-access model) | Medium | Good, not urgent |
| 7 | Self-logged BP trend for Care subscribers (hypertension-specific) | Strong for hypertension, weak for diabetes — say so | Partial (Care schema exists) | Medium | Narrow, honest scope only |
| 8 | Bhashini regional-language voice booking/Rx-reading | Strong signal, very new (Feb 2026), government-backed | None yet — new integration | High | Worth a discovery spike, not a v1 commit |

## 2. Detailed picks

### 2.1 Cancellation waitlist / auto-backfill — the standout pick

**What:** A patient viewing a fully-booked day can tap "Notify me if this
opens up." When a confirmed appointment is cancelled (already possible, ≥2h
window), the system offers the freed slot to the next waitlisted patient with
a short claim window, same shape as the existing 10-minute booking hold.

**Evidence:** A typical practice runs a 14% cancellation rate; missed slots
cost ~$200 each; one modeled example put annual lost revenue at $274,000 for
a mid-size practice. Manual phone-call backfill — what most practices still
do — succeeds only 12% of the time despite 88% of practices attempting it.
Automated waitlist/backfill tools recover 6–10 appointments per week and cut
overbooking by 60% while keeping slots filled with confirmed patients, not
guesses.

**Why this fits MediFlow specifically, more than it fits the practices in
that research:** those numbers are from multi-provider practices where one
empty slot is a fraction of total capacity. MediFlow is a **single doctor** —
every cancelled slot is 100% of that doctor's revenue for that time, with no
other provider to absorb it. The case for automating backfill is stronger
here than in the research, not weaker.

**Reuse:** the entire hard part already exists — the partial unique index,
the hold-and-expire pattern (`holdExpiresAt`), the cancellation flow. This is
a new notify-queue and a trigger at cancellation time, not new
infrastructure. No new vendor, no patent-crowded mechanism (unlike Vault
Share), no regulatory surface. The lowest-risk, best-evidenced idea in this
entire pass.

### 2.2 "Quick Ask" — async, low-acuity visits open to any patient

**What:** A cheaper, non-real-time consult path: patient describes a simple
issue (optionally with a photo — think a rash, a med question, "is this
normal after my last visit") and the doctor responds within a committed
window (e.g., 6–12 hours) between video slots, instead of a live call.

**Evidence:** store-and-forward telehealth adoption grew 312% from 2020 to
2024. The literature is genuinely positive for low-acuity and visual
conditions specifically — teledermatology shows high diagnostic concordance
with in-person assessment and faster time-to-treatment. The honest caveat:
some studies report higher workload/less efficient workflow for the clinician
than face-to-face, and US reimbursement for store-and-forward is thin (only
15 states cover it under Medicaid) — but that reimbursement caveat doesn't
transfer to MediFlow, which is cash-pay and prices its own services directly.

**Why this fits:** the schema already has `appointmentMode` = `video | async`
— async is not a new concept in this codebase, just a new *surface*. Today
async only exists inside MediFlow Care as a gated monthly follow-up credit
for existing subscribers (`care-subscription-plan.md`). Quick Ask is
deliberately **separate and ungated** — a pay-per-use option open to new and
returning patients alike, priced below a full video consult. It doesn't
compete with Care's "one plan, not tiers" decision (not re-litigating that);
it's a different product on the same underlying `mode=async` column, aimed
at first-contact and casual use rather than ongoing subscribers. It also
monetizes the doctor's dead time between video slots instead of leaving it
idle, and gives a lower-commitment trial path for a patient who's never
booked with this doctor before.

**Honest risk:** clinician workload — a solo doctor's Quick Ask queue needs a
visible cap (e.g., "accepting 5 Quick Asks today") so it doesn't become an
unbounded inbox competing with the live schedule.

### 2.3 Audio-only / low-bandwidth call fallback

**What:** A visible "Switch to audio-only" option during a video call, and
ideally an automatic suggestion when connection quality degrades — video
pauses, audio continues, the call doesn't drop.

**Evidence:** rural India internet penetration was 37% versus 69% urban as of
2022; power outages and poor bandwidth are named repeatedly as the top
barrier to real-time teleconsultation specifically (as opposed to booking or
messaging, which tolerate poor connections fine). 2026 practice in this space
explicitly treats low-bandwidth design (audio-only fallback, low-bitrate
codecs, bonded cellular) as a core requirement, not an edge case, for exactly
this reason.

**Why this fits:** LiveKit (already MediFlow's video provider) supports
per-track publish/unpublish and exposes connection-quality signals natively —
this is a product-level toggle on top of infrastructure MediFlow already
pays for, not a new vendor or new architecture. It's also the one idea in
this list that directly grows MediFlow's addressable geography — every other
idea here improves the experience for patients who can already reach the
platform; this one reaches patients who currently can't.

### 2.4 AI ambient scribe — already on the roadmap, worth reprioritizing

Not a new idea — `PRODUCT.md` already lists this for Phase 3/v1.5. Worth
surfacing because the evidence turned out to be the **strongest of anything
in this research pass**, stronger than most of what's being proposed as new:
68% of health systems had adopted ambient AI scribes by 2026 (62% YoY
growth), one multisite study of 8,581 clinicians found real (if "modest")
time savings — roughly 13–16 minutes of documentation time per clinician per
day — and multiple studies report reduced burnout and clinicians feeling
"more present" with patients, not just faster. The honest caveat: accuracy
and hallucination concerns are real and consistently flagged, which is
exactly why MediFlow's existing "doctor authors and signs, AI never
prescribes independently" posture (already the stated policy) is the right
guardrail, not an overcautious one.

**Suggested pairing (new, cheap once the scribe pipeline exists):** generate
not just the SOAP note but a short **plain-language visit summary** for the
patient — "what we found, what to do, what to watch for" — instead of
handing over a raw clinical note and a medicine list. This also feeds
directly into the vault timeline discussed previously, giving patients
something readable in their own history, not just clinical shorthand.

### 2.5 Caregiver / proxy booking for dependents

**What:** A parent managing bookings/records for a child, or an adult child
managing an elderly parent's care — a real, common need, especially in
India's family structures.

**Evidence:** proxy access is a mature, well-adopted pattern — 86% of US
hospitals already offered it by 2017. The correct design, per how mature
systems (MyChart) do it: the proxy has **their own account** with delegated
access to the dependent's record, not a shared password — worth stating
explicitly since the wrong version of this (shared login) is a real security
regression, not a shortcut.

**Why this fits:** `medical-vault.md` already flagged "family/dependent
records" as a fast-follow for the vault specifically; this generalizes the
same underlying need to booking and the rest of the app, not just record
viewing. Good, proven idea — not urgent relative to §2.1–2.3, but worth
designing deliberately rather than bolting on later.

### 2.6 Self-logged BP trend for Care subscribers — hypertension only, said honestly

**What:** A lightweight, no-hardware, self-entered blood-pressure log inside
MediFlow Care, charted over time, visible to the doctor between visits.

**Evidence — read this carefully, it's mixed and the mixture matters:**
telemonitored blood pressure control shows a real, sustained effect —
patients enrolled in BP telemonitoring were more likely to reach control at
3 months, with the benefit **persisting through 12 months**, and it's
cost-effective. Diabetes evidence, by contrast, is weak: RPM "probably makes
little to no difference on HbA1c levels." **The honest scope, then, is
hypertension-specific**, not a generic "chronic disease monitoring" feature —
building it for diabetes on the strength of the hypertension evidence would
be borrowing credibility it doesn't have.

**Why this fits:** no device/hardware integration needed for a v1 (manual
entry, not Bluetooth cuffs) — that's deliberately the full remote-patient-
monitoring market's dependency (a $36B→$66B market by 2031, but one built on
US Medicare RPM billing codes MediFlow has no equivalent to), and MediFlow
doesn't need that complexity to capture the hypertension-specific evidence.
Fits inside the existing Care subscription rather than requiring a new
product.

### 2.7 Bhashini regional-language voice — flag as a discovery spike, not a commit

**What:** India's government language-AI platform (Bhashini) launched an
open-source voice AI stack (VoicERA) in February 2026 and partnered with the
National Health Authority the same quarter to bring multilingual,
voice-enabled interaction — specifically including **appointment booking and
e-prescription reading** — to ABDM-linked services in 22 languages.

**Why this is exciting, not just another checkbox:** this is current (weeks
old at time of writing), it's the same government infrastructure MediFlow's
own ABDM-adjacent thinking already has to track (business doc, Vault Share),
it's open-source rather than a paid vendor lock-in, and it directly attacks
the biggest named barrier in India telemedicine literature after
connectivity: language. Most competitors, including the funded ones named
earlier, are English/Hindi-first.

**Honest caveat:** this is a real integration project against a brand-new
government platform, not a weekend feature — translation quality at launch is
unknown, and doctor-side content (SOAP notes, advice text) is authored in
English today, so a full voice loop needs a translation layer on both ends,
not just speech-to-text on the patient's side. Recommend a small discovery
spike (what does the API actually support today, what's the real latency and
accuracy) before scoping it as a real feature — not because the idea is
weak, but because it's too new to size confidently yet.

## 3. Explicitly passed on

- **Full remote patient monitoring with connected devices** (Bluetooth BP
  cuffs/glucometers) — the evidence and market are real, but the dependency
  chain (device sourcing/distribution, no India RPM-reimbursement equivalent
  to lean on) is disproportionate to what MediFlow needs right now. The
  hypertension-specific, self-logged version (§2.6) captures the strongest
  part of the evidence without the hardware logistics problem.
- **PROMs as a headline retention feature** — legitimate, respected clinical
  practice, but the adherence evidence is genuinely mixed ("none of 15
  studied factors had conclusive evidence for adherence" in one systematic
  review) — not strong enough to build as a standalone feature. A single
  lightweight post-Rx check-in ("did this help? better / same / worse") is
  cheap enough to fold into the doctor-digest/notes work already planned,
  but shouldn't be sold internally as a proven engagement driver.
- **E-pharmacy, insurance/claims, physical kiosks/hardware** — already ruled
  out by `PRODUCT.md` (e-pharmacy) or not evidenced as fitting a cash-pay,
  single-doctor India practice (insurance, Amwell-style hardware carts).

## 4. Suggested order

Cancellation waitlist first (§2.1) — cheapest, best-evidenced, reuses the
most existing code, zero regulatory surface, and the revenue case is
strongest precisely because MediFlow is single-doctor. Quick Ask (§2.2) and
audio-only fallback (§2.3) next, in either order — both cheap, both
evidence-backed, both extend reach rather than adding a new risk surface. AI
scribe reprioritization (§2.4) is a sequencing conversation, not new build
scope — worth revisiting given how strong its evidence turned out to be
relative to items already ahead of it in the roadmap. Caregiver proxy (§2.5)
and the hypertension log (§2.6) are good, proven, not urgent. Bhashini
(§2.7) gets a small time-boxed spike to find out what's actually possible,
not a scoped commitment yet.

---

## Sources

- [Store and Forward Telehealth: 2026 Implementation Guide — Arkenea](https://arkenea.com/blog/the-complete-guide-to-store-and-forward-telehealth/)
- [Effectiveness and safety of asynchronous telemedicine consultations — systematic review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11169987/)
- [Store-and-Forward Teledermatology for Assessing Skin Cancer — literature review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10335330/)
- [Outcomes of Team-Based Digital Monitoring of Patients With Multiple Chronic Conditions — JMIR Cardio](https://cardio.jmir.org/2025/1/e75170)
- [How RPM Devices Improve Hypertension & Diabetes Outcomes](https://www.healtharc.io/blogs/how-rpm-devices-improve-hypertension-and-diabetes-outcomes-in-medicare-populations/)
- [Clinical Evidence Behind Remote Patient Monitoring Outcomes](https://vivocaresolutions.com/blog/remote-patient-monitoring-clinical-evidence/)
- [JMIR Medical Informatics — Impact of an Ambient AI Scribe: Time-Motion Study](https://medinform.jmir.org/2026/1/e85580)
- [Large AI scribe study finds modest time savings, inconsistent use — STAT](https://www.statnews.com/2026/04/01/ai-ambient-scribes-modest-time-savings-clinical-documentation/)
- [Ambient AI Medical Scribes: Efficiency Gains, Burnout Uncertainty, Governance Risks](https://www.ihsonline.org/post/ambient-ai-medical-scribes-efficiency-gains-burnout-uncertainty-and-governance-risks)
- [Adherence to Telemonitoring by ePROMs in Chronic Diseases — systematic review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8508527/)
- [Use of PROMs/PREMs Within Evaluation Studies of Telemedicine — systematic review](https://www.sciencedirect.com/org/science/article/pii/S1438887121011316)
- [Patient Waitlist Management: Fill Cancellations Fast — Zocdoc](https://www.zocdoc.com/resources/blog/article/how-to-improve-patient-waitlist-management-and-fill-cancellations-faster/)
- [Optimising the booking horizon in healthcare clinics considering no-shows and cancellations](https://www.tandfonline.com/doi/full/10.1080/00207543.2021.1913292)
- [Backfill Healthcare Waitlist Cancellations Automatically — US Tech Automations](https://ustechautomations.com/resources/blog/healthcare-waitlist-cancellation-backfill-pain-solution-2026)
- [Caregiver Proxy Patient Portal Access — TechTarget](https://www.techtarget.com/patientengagement/news/366584700/Caregiver-Proxy-Patient-Portal-Access-Leaves-Much-to-Be-Desired)
- [Understanding Proxy Access for the Patient Portal, Privacy Questions — TechTarget](https://www.techtarget.com/patientengagement/feature/Understanding-Proxy-Access-for-the-Patient-Portal-Privacy-Questions)
- [Rural Telehealth Without Reliable Internet: Low-Bandwidth & Hub-and-Spoke (2026)](https://www.mindbowser.com/rural-telehealth-low-bandwidth/)
- [Challenges, Barriers, and Facilitators in Telemedicine Implementation in India — scoping review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11414145/)
- [Telemedicine Reduces Missed Appointments but Disparities Persist](https://pubmed.ncbi.nlm.nih.gov/38373529/)
- [Exclusive: Healthtech Startup MFine Fires 75% Workforce — Inc42](https://inc42.com/buzz/exclusive-healthtech-startup-mfine-fires-600-employees/)
- [Telehealth in 2026: Key insights for physicians — Sermo](https://www.sermo.com/resources/telehealth-key-insights-for-physicians/)
- [Amwell vs Teladoc Health — Which Telehealth Platform Wins in 2026?](https://www.selecthub.com/telehealth-platforms/amwell-vs-teladoc-health/)
- [Bhashini Partners with NHA to Deploy Multilingual Voice-Enabled AI Across Ayushman Bharat Platforms](https://healthbuzz.in/bhashini-partners-with-nha-to-deploy-multilingual-voice-enabled-ai-across-ayushman-bharat-platforms/)
- [VoicERA Launched on BHASHINI National Infrastructure — PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2229732&reg=3&lang=1)
