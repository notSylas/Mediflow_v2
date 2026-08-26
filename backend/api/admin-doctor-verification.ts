import { z } from "zod";
import { requireAdminSession } from "~backend/auth/api-auth";
import {
  decideDoctorVerification,
  getDoctorVerificationDetail,
  getVerificationDocument,
  listPendingDoctorVerifications,
} from "~backend/people/doctor-verification";
import type { ApiHandler } from "./http";

/** GET /api/admin/doctor-verification — the pending review queue. */
export const listPendingVerifications: ApiHandler = async (request) => {
  const access = await requireAdminSession(request.headers);
  if (access instanceof Response) return access;

  return Response.json({ pending: await listPendingDoctorVerifications() });
};

/** GET /api/admin/doctor-verification/:doctorId — one doctor's full submission. */
export const getDoctorVerification: ApiHandler = async (request, { params }) => {
  const access = await requireAdminSession(request.headers);
  if (access instanceof Response) return access;

  const detail = await getDoctorVerificationDetail(params.doctorId);
  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(detail);
};

/**
 * GET /api/admin/verification-documents/:documentId — the document itself.
 * A sibling top-level path (not nested under doctor-verification) so it's
 * unambiguous at the router level. Admin-only, same as every route here.
 */
export const downloadVerificationDocument: ApiHandler = async (request, { params }) => {
  const access = await requireAdminSession(request.headers);
  if (access instanceof Response) return access;

  const doc = await getVerificationDocument(params.documentId);
  if (!doc) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
    },
  });
};

const decisionSchema = z.object({
  notes: z.string().trim().max(2000).nullable().optional(),
});

/** POST /api/admin/doctor-verification/:doctorId/approve */
export const approveDoctorVerification: ApiHandler = async (request, { params }) => {
  const access = await requireAdminSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = decisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const ok = await decideDoctorVerification(
    params.doctorId,
    access.id,
    "verified",
    parsed.data.notes ?? null
  );
  if (!ok) {
    return Response.json({ error: "Not pending — nothing to approve" }, { status: 409 });
  }
  return Response.json({ status: "verified" });
};

/** POST /api/admin/doctor-verification/:doctorId/reject */
export const rejectDoctorVerification: ApiHandler = async (request, { params }) => {
  const access = await requireAdminSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = decisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const ok = await decideDoctorVerification(
    params.doctorId,
    access.id,
    "rejected",
    parsed.data.notes ?? null
  );
  if (!ok) {
    return Response.json({ error: "Not pending — nothing to reject" }, { status: 409 });
  }
  return Response.json({ status: "rejected" });
};
