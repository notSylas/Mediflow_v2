import { z } from "zod";
import { requireSession } from "~backend/auth/api-auth";
import { CONSENT_SOURCES, recordTermsAcceptance } from "~backend/auth/terms-consent";
import type { ApiHandler } from "./http";

const acceptTermsSchema = z.object({
  source: z.enum(CONSENT_SOURCES),
});

/** POST /api/account/accept-terms */
export const acceptTerms: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = acceptTermsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  await recordTermsAcceptance(access.id, parsed.data.source);
  return Response.json({ ok: true });
};
