# MediFlow v2 — Deferred Work

Items considered and explicitly deferred during reviews, with enough context
to pick them up later without re-deriving the reasoning. Not a backlog of
everything possible — only things that came up in a real review and were
deliberately pushed out, not forgotten.

## Remember-device for doctor login

**What:** An extended/trusted-device session for the doctor's daily sign-in, so OTP isn't required every single time from the same device.

**Why:** The doctor logs in far more frequently than any single patient. Per-login OTP friction is a real daily cost for the one user who uses the product the most.

**Pros:** Meaningfully reduces daily friction for the doctor; doesn't affect patient-side security posture at all.

**Cons:** Extended/trusted sessions are a real security tradeoff (longer-lived credentials = larger window if a device is compromised) and need a properly designed mechanism (device fingerprinting vs. long-lived signed cookie vs. Better Auth's own session-extension options) — not a quick toggle.

**Context:** Surfaced during the 2026-06-25 auth-split CEO review (`~/.gstack/projects/notSylas-Mediflow_v2/ceo-plans/2026-06-25-auth-split-and-otp-primary.md`). Deferred because it needs its own security review, not because it's low-value.

**Effort estimate:** M (human) → S (CC+gstack)
**Priority:** P3
**Depends on / blocked by:** Nothing — can be picked up independently once the OTP-primary auth split ships.

---

## Passkey (FIDO2/WebAuthn) support

**What:** Add passkey sign-in as an option, eventually the primary method for returning users on enrolled devices, replacing OTP-as-primary.

**Why:** 2026 industry standard frames passkeys as the gold standard replacing OTP/TOTP — phishing-resistant, no typing, stronger guarantees than email OTP (confirmed via landscape research during the 2026-06-25 CEO review).

**Pros:** Best-in-class security and UX for returning users; removes email-interception risk entirely for the doctor's daily login.

**Cons:** Genuinely the biggest lift of any deferred item here — needs a passkey plugin integration (Better Auth has one), device-enrollment UX, and a fallback design for patients/devices that don't support it. Bigger than everything else in the 2026-06-25 auth plan combined.

**Context:** Surfaced during the 2026-06-25 auth-split CEO review. The "platonic ideal" direction per the landscape check, deliberately not bundled into the page-split + OTP-primary fix.

**Effort estimate:** XL (human) → L (CC+gstack)
**Priority:** P3
**Depends on / blocked by:** Nothing technically, but makes most sense after the doctor has a stable daily-use pattern to design the enrollment UX around.

---

## Doctor onboarding / credentialing flow (multi-doctor)

**What:** A real in-app flow for adding new doctors beyond the current single-doctor v1 — likely an application + credential verification (medical license/registration lookup, possibly document upload) + approval step, not a simple self-service signup.

**Why:** Today, the *only* way an account becomes `role=doctor` is `scripts/promote-doctor.ts`, run manually from the CLI. There is no in-app request, approval, or credentialing mechanism at all. That's correct for v1 (single doctor, added once by hand) but won't scale to multiple doctors.

**Pros:** Unlocks the multi-doctor future `AGENTS.md` already designed the data model for (`doctor_profiles` is its own entity specifically so multi-doctor is "an insert, not a migration"). Replaces an manual, unscalable process.

**Cons:** Verifying medical credentials is a real trust/liability problem, not a UI problem — a naive "approve/reject" button would create a false sense of verification without actually confirming anyone is a licensed doctor. Needs real design work (what counts as proof? who reviews it? what's the liability if wrong?) before any code gets written.

**Context:** Surfaced when the user asked "how do we decide who's a doctor" during the 2026-06-25 auth-split CEO review. `docs/PRD.md` already explicitly lists "doctor signup/onboarding" as out of v1 scope — this item formalizes that as a tracked future decision rather than an unstated gap.

**Effort estimate:** L (human) → M (CC+gstack) — for the credentialing *design* discussion; the actual build effort depends heavily on what verification method is chosen.
**Priority:** P3
**Depends on / blocked by:** Should wait until there's a real second doctor to onboard — designing a credentialing flow in the abstract, with no real case to design against, risks over-engineering.
