// Pure Vault Share decisions, kept free of DB access so they can be
// unit-tested directly — mirrors the chat.ts / chat-policy.ts split.

import { createHash, randomBytes } from "node:crypto";

export type VaultShareScope = "everything" | "last_6_months";

export function isValidScope(value: unknown): value is VaultShareScope {
  return value === "everything" || value === "last_6_months";
}

/** Resolves a scope preset to concrete timestamps at request time — never re-interpreted later. */
export function resolveScope(
  scope: VaultShareScope,
  now: Date
): { scopeFrom: Date | null; scopeTo: Date } {
  if (scope === "everything") return { scopeFrom: null, scopeTo: now };
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return { scopeFrom: sixMonthsAgo, scopeTo: now };
}

// Crockford Base32 — excludes visually ambiguous I/L/O/U so a patient can
// read it aloud and a doctor can type it back correctly.
const SHARE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SHARE_CODE_LENGTH = 13;

/**
 * ~65 bits of entropy (13 Crockford Base32 chars). There is no OTP-confirm
 * step anymore — a share goes live the moment it's created — and no
 * time-based expiry either (removed 2026-08-23: a share is valid until the
 * patient revokes it or creates a replacement, see createShare() in
 * vault-share.ts). That makes this code's entropy the *entire* defense
 * against guessing, indefinitely, not one layer bounded by a short window —
 * 13 chars is sized to still be infeasible to brute-force on its own.
 */
export function generateShareCode(): string {
  const bytes = randomBytes(SHARE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += SHARE_CODE_ALPHABET[bytes[i] % SHARE_CODE_ALPHABET.length];
  }
  return code;
}

/** Fast hash is correct here — protection comes from code entropy alone, not offline hash resistance. */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export interface ScopeSummary {
  from: string | null;
  to: string;
}

export function scopeSummary(scopeFrom: Date | null, scopeTo: Date): ScopeSummary {
  return { from: scopeFrom ? scopeFrom.toISOString() : null, to: scopeTo.toISOString() };
}

// Bump when the standing-doctor-access notice's copy materially changes, so a
// re-consent could be required in future — mirrors booking.ts's CONSENT_VERSION.
export const VAULT_DOCTOR_CONSENT_VERSION = "2026-08-23";
