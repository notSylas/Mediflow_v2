import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~backend/db";
import { user } from "~backend/db/schema";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { requireSession } from "~backend/auth/api-auth";
import type { ApiHandler } from "./http";

const registerDoctorSchema = z.object({
  code: z.string().trim().min(1),
});

/**
 * POST /api/doctor/register — the in-product replacement for
 * scripts/promote-doctor.ts. Any signed-in user (patient by default — see
 * backend/auth/auth.ts's `role` field, `input: false` with a `"patient"`
 * default) can call this, so it's gated by a shared secret rather than any
 * role check. Deliberately fails CLOSED when DOCTOR_SIGNUP_CODE is unset —
 * unlike CRON_SECRET (backend/api/cron.ts), which is low-stakes enough to
 * run open if unset, an unset signup code must never leave role promotion
 * open to any patient.
 *
 * Still a single-doctor app: this doesn't touch getCanonicalDoctorProfile's
 * oldest-row resolution (backend/people/doctor.ts). A second registration
 * would create a real doctor_profiles row that no patient-facing surface
 * would ever resolve to — the same gap scripts/promote-doctor.ts already
 * has today, not introduced here.
 */
export const registerAsDoctor: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  if (access.role === "doctor") {
    return Response.json({ ok: true, alreadyDoctor: true });
  }

  const json = await request.json();
  const parsed = registerDoctorSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const secret = process.env.DOCTOR_SIGNUP_CODE;
  if (!secret) {
    return Response.json(
      { error: "Doctor registration is not enabled" },
      { status: 503 }
    );
  }

  if (parsed.data.code !== secret) {
    return Response.json({ error: "Invalid registration code" }, { status: 401 });
  }

  await db.update(user).set({ role: "doctor" }).where(eq(user.id, access.id));
  await getOrCreateDoctorProfile(access.id);

  return Response.json({ ok: true });
};
