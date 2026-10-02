import { z } from "zod";
import { requireDoctorSession } from "~backend/auth/api-auth";
import {
  ALLOWED_VERIFICATION_DOC_TYPES,
  MAX_VERIFICATION_DOC_SIZE_BYTES,
  submitDoctorVerification,
  upsertVerificationDocument,
} from "~backend/people/doctor-verification";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { verifyFileContentType } from "~backend/core/file-validation";
import type { ApiHandler } from "./http";

const DOC_KINDS = ["identity", "registration", "hpr"] as const;

const submitSchema = z.object({
  registrationNo: z.string().trim().min(1).max(100),
  stateMedicalCouncil: z.string().trim().min(1).max(200),
  yearOfRegistration: z.number().int().min(1950).max(new Date().getFullYear()),
  systemOfMedicine: z.enum(["allopathy", "homeopathy", "ayurveda"]),
  hprId: z.string().trim().max(100).nullable().optional(),
});

/**
 * POST /api/doctor/verification/submit — the doctor's RMP verification
 * request. Requires identity + registration documents already uploaded via
 * /api/doctor/verification/documents (server-enforced, see
 * submitDoctorVerification). Flips verificationStatus to "pending" for the
 * admin queue.
 */
export const submitVerification: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const json = await request.json();
  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await submitDoctorVerification(access.id, {
    ...parsed.data,
    hprId: parsed.data.hprId ?? null,
  });

  if (!result.ok) {
    if (result.reason === "invalid_status") {
      return Response.json(
        { error: "A verification review is already pending or complete" },
        { status: 409 }
      );
    }
    return Response.json(
      { error: "Upload your identity and registration documents first" },
      { status: 400 }
    );
  }

  return Response.json({ status: "pending" }, { status: 201 });
};

/**
 * POST /api/doctor/verification/documents — uploads (or replaces) one
 * verification document. Same shape as uploadDoctorSignature
 * (backend/api/doctor.ts) — multipart form, MIME/size allow-list, stored
 * inline as bytea — plus a `kind` field selecting which document this is.
 */
export const uploadVerificationDocument: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof kind !== "string" || !DOC_KINDS.includes(kind as (typeof DOC_KINDS)[number])) {
    return Response.json({ error: "Invalid document kind" }, { status: 400 });
  }
  if (
    !ALLOWED_VERIFICATION_DOC_TYPES.includes(
      file.type as (typeof ALLOWED_VERIFICATION_DOC_TYPES)[number]
    )
  ) {
    return Response.json({ error: "Only PDF, PNG, and JPG are supported" }, { status: 400 });
  }
  if (file.size > MAX_VERIFICATION_DOC_SIZE_BYTES) {
    return Response.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!(await verifyFileContentType(buffer, ALLOWED_VERIFICATION_DOC_TYPES))) {
    return Response.json(
      { error: "File content doesn't match a supported PDF, PNG, or JPG" },
      { status: 400 }
    );
  }

  const profile = await getOrCreateDoctorProfile(access.id);

  await upsertVerificationDocument(profile.id, kind as (typeof DOC_KINDS)[number], {
    buffer,
    filename: file.name,
    mimeType: file.type,
  });

  return Response.json({ status: "uploaded" }, { status: 201 });
};
