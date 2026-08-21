// Pure Vault Share decisions, kept free of DB access so they can be
// unit-tested directly — mirrors the chat.ts / chat-policy.ts split.

import { createHash, randomBytes, randomInt } from "node:crypto";

export type VaultShareScope = "everything" | "last_6_months";

// An explicit allowlist, not arbitrary client input — 2 hours / 24 hours / 7 days.
export const ALLOWED_DURATION_MINUTES = [120, 1440, 10080] as const;
export type VaultShareDurationMinutes = (typeof ALLOWED_DURATION_MINUTES)[number];

export function isValidDurationMinutes(value: unknown): value is VaultShareDurationMinutes {
  return ALLOWED_DURATION_MINUTES.includes(value as VaultShareDurationMinutes);
}

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

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

/** 6-digit numeric, matching the login-OTP UX patients already know. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Crockford Base32 — excludes visually ambiguous I/L/O/U so a patient can
// read it aloud and a doctor can type it back correctly.
const SHARE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SHARE_CODE_LENGTH = 8;

/**
 * ~40 bits of entropy — deliberately not password-grade. The security model
 * is short expiry + rate-limited attempts (see SHARE_CODE_MAX_ATTEMPTS), the
 * same reasoning that makes a 6-digit login OTP acceptable despite its own
 * low raw entropy.
 */
export function generateShareCode(): string {
  const bytes = randomBytes(SHARE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += SHARE_CODE_ALPHABET[bytes[i] % SHARE_CODE_ALPHABET.length];
  }
  return code;
}

/** Fast hash is correct here — protection comes from expiry + attempt caps, not offline hash resistance. */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export function otpExpired(otpExpiresAt: Date | null, now: Date): boolean {
  return !otpExpiresAt || otpExpiresAt.getTime() < now.getTime();
}

export function otpAttemptsExceeded(otpAttempts: number): boolean {
  return otpAttempts >= OTP_MAX_ATTEMPTS;
}

export function grantExpired(expiresAt: Date | null, now: Date): boolean {
  return !expiresAt || expiresAt.getTime() < now.getTime();
}

export interface ScopeSummary {
  from: string | null;
  to: string;
}

export function scopeSummary(scopeFrom: Date | null, scopeTo: Date): ScopeSummary {
  return { from: scopeFrom ? scopeFrom.toISOString() : null, to: scopeTo.toISOString() };
}
