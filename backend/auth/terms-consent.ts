import { eq } from "drizzle-orm";
import { db } from "~backend/db";
import { user as userTable } from "~backend/db/schema";

// Bump when Terms or Privacy content materially changes — matches the "Last
// updated" date on web/app/(legal)/terms and /privacy. A user who accepted an
// older version is asked to accept again before continuing.
export const TERMS_VERSION = "2026-06-14";

export const CONSENT_SOURCES = ["web", "ios", "android"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export async function hasAcceptedCurrentTerms(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ termsAcceptedVersion: userTable.termsAcceptedVersion })
    .from(userTable)
    .where(eq(userTable.id, userId));
  return row?.termsAcceptedVersion === TERMS_VERSION;
}

export async function recordTermsAcceptance(
  userId: string,
  source: ConsentSource
): Promise<void> {
  await db
    .update(userTable)
    .set({
      termsAcceptedVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
      termsAcceptedSource: source,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));
}
