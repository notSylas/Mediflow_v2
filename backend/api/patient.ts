import { requireSession } from "~backend/auth/api-auth";
import {
  getPatientProfile,
  patientProfileUpdateSchema,
  updatePatientIdentityAndProfile,
} from "~backend/people/patient";
import type { ApiHandler } from "./http";

/** GET /api/patient/profile */
export const readPatientProfile: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  return Response.json(await getPatientProfile(access.id));
};

/** PUT /api/patient/profile */
export const updatePatientProfile: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = patientProfileUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const saved = await updatePatientIdentityAndProfile(access.id, parsed.data);
  return Response.json(saved);
};
