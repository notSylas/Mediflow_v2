/**
 * The user.role values in use across the app. Not a DB enum — the column
 * stays plain text (Better Auth's own field is typed "string" regardless,
 * and role is never user input, see auth.ts's additionalFields.role) — this
 * is just the shared TS type so call sites don't each spell out the union.
 */
export const USER_ROLES = ["patient", "doctor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
