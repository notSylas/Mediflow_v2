import { createHash } from "node:crypto";
import { z } from "zod";
import { requireSession } from "~backend/auth/api-auth";
import { ALLOWED_REPORT_TYPES, MAX_REPORT_SIZE_BYTES } from "~backend/consult/reports";
import { vaultEncryptionAvailable } from "~backend/vault/vault-crypto";
import { ALLOWED_DURATION_MINUTES } from "~backend/vault/vault-share-policy";
import {
  confirmShare,
  createPendingShare,
  exportVault,
  getVaultTimeline,
  listShares,
  redeemShareCode,
  revokeShare,
} from "~backend/vault/vault-share";
import {
  createVaultRecord,
  deleteVaultRecord,
  getVaultRecord,
  updateVaultRecord,
} from "~backend/vault/vault-records";
import type { ApiHandler } from "../http";

const medicineSchema = z.object({
  name: z.string().min(1),
  strength: z.string().nullable(),
  route: z.string().nullable(),
  morning: z.boolean(),
  afternoon: z.boolean(),
  evening: z.boolean(),
  night: z.boolean(),
  foodRelation: z.string().nullable(),
  durationDays: z.number().int().nullable(),
  instructions: z.string().nullable(),
});

const patchRecordSchema = z.object({
  recordType: z.enum([
    "prescription",
    "lab",
    "scan",
    "discharge_summary",
    "vaccination",
    "other",
  ]),
  recordDate: z.string().nullable(),
  sourceFacility: z.string().nullable(),
  sourceDoctorName: z.string().nullable(),
  diagnosis: z.string().nullable(),
  advice: z.string().nullable(),
  medicines: z.array(medicineSchema),
});

const createShareSchema = z.object({
  scope: z.enum(["everything", "last_6_months"]),
  durationMinutes: z.union([
    z.literal(ALLOWED_DURATION_MINUTES[0]),
    z.literal(ALLOWED_DURATION_MINUTES[1]),
    z.literal(ALLOWED_DURATION_MINUTES[2]),
  ]),
});

const confirmShareSchema = z.object({
  grantId: z.string().uuid(),
  otp: z.string().min(1),
});

const redeemSchema = z.object({ code: z.string().min(1) });

const REASON_STATUS: Record<string, number> = {
  not_found: 404,
  wrong_code: 400,
  expired: 410,
  locked: 423,
};

const REASON_MESSAGE: Record<string, string> = {
  not_found: "This share request wasn't found.",
  wrong_code: "That code doesn't match. Please check your email and try again.",
  expired: "This code has expired. Start the share again.",
  locked: "Too many wrong attempts — start the share again.",
};

/**
 * GET /api/v1/patient/vault — the patient's own vault timeline. Read-time
 * aggregation, never materialized.
 */
export const getVault: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const items = await getVaultTimeline(access.id);
  return Response.json({ items });
};

/**
 * POST /api/v1/patient/vault/records — Tier 2 upload: a record from any
 * doctor, not just MediFlow's own. Stores the file once, runs extraction, and
 * returns the created draft for the patient to review; `patientConfirmed`
 * stays false until the PATCH step.
 */
export const createRecord: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_REPORT_TYPES.includes(file.type as (typeof ALLOWED_REPORT_TYPES)[number])) {
    return Response.json(
      { error: "Only PDF, JPG, and PNG files are supported" },
      { status: 400 }
    );
  }
  if (file.size > MAX_REPORT_SIZE_BYTES) {
    return Response.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const record = await createVaultRecord(access.id, {
    buffer,
    filename: file.name,
    mimeType: file.type,
  });

  return Response.json({ record }, { status: 201 });
};

/** GET /api/v1/patient/vault/records/:id — powers the web review/edit screen. */
export const getRecord: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const record = await getVaultRecord(params.id, access.id);
  if (!record) {
    return Response.json({ error: "Record not found" }, { status: 404 });
  }
  return Response.json({ record });
};

/**
 * PATCH /api/v1/patient/vault/records/:id — review step: the patient corrects
 * or completes the extracted fields and confirms.
 */
export const updateRecord: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = patchRecordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const record = await updateVaultRecord(params.id, access.id, parsed.data);
  if (!record) {
    return Response.json({ error: "Record not found" }, { status: 404 });
  }
  return Response.json({ record });
};

/**
 * DELETE /api/v1/patient/vault/records/:id — discard an upload, e.g. a bad
 * photo the patient doesn't want to keep.
 */
export const deleteRecord: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const deleted = await deleteVaultRecord(params.id, access.id);
  if (!deleted) {
    return Response.json({ error: "Record not found" }, { status: 404 });
  }
  return Response.json({ status: "deleted" });
};

/**
 * GET /api/v1/patient/vault/export — full vault export, satisfying the DPDP
 * data-subject access right. JSON for this build, not a formatted PDF.
 */
export const exportVaultHandler: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const data = await exportVault(access.id);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mediflow-vault-export.json"`,
    },
  });
};

/**
 * POST /api/v1/patient/vault/share — step 1 of Flow A: starts a share and
 * sends the self-confirm OTP.
 */
export const createShare: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  if (!vaultEncryptionAvailable()) {
    return Response.json(
      { error: "Vault sharing isn't available right now. Please try again shortly." },
      { status: 503 }
    );
  }

  const parsed = createShareSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { grantId, otpSentTo } = await createPendingShare(
    access.id,
    parsed.data.scope,
    parsed.data.durationMinutes
  );
  return Response.json({ grantId, otpSentTo }, { status: 201 });
};

/**
 * GET /api/v1/patient/vault/share — the patient's own share history:
 * active/expired/revoked grants plus view counts.
 */
export const listSharesHandler: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const grants = await listShares(access.id);
  return Response.json({ grants });
};

/**
 * POST /api/v1/patient/vault/share/confirm — step 2 of Flow A: verifies the
 * OTP and mints the encrypted bundle + share code.
 */
export const confirmShareHandler: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const parsed = confirmShareSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await confirmShare(parsed.data.grantId, access.id, parsed.data.otp);
  if (!result.ok) {
    return Response.json(
      { error: REASON_MESSAGE[result.reason] },
      { status: REASON_STATUS[result.reason] }
    );
  }

  const origin = new URL(request.url).origin;
  const qrPayload = `${origin}/vault/view?code=${result.shareCode}`;
  return Response.json({
    shareCode: result.shareCode,
    qrPayload,
    expiresAt: result.expiresAt,
  });
};

/**
 * POST /api/v1/patient/vault/share/:id/revoke — immediate revoke; the next
 * redeem attempt fails from here on even with the right code.
 */
export const revokeShareHandler: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const revoked = await revokeShare(params.id, access.id);
  if (!revoked) {
    return Response.json(
      { error: "This share isn't active, or doesn't belong to you." },
      { status: 409 }
    );
  }
  return Response.json({ status: "revoked" });
};

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // Truncated hash: enough to spot repeat abuse patterns, not enough to be a
  // durable identifier — matches Rules.md #11's "no PII beyond what's needed".
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function coarseUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  if (/mobile/i.test(ua)) return "mobile";
  if (/edg/i.test(ua)) return "edge";
  if (/chrome/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  if (/firefox/i.test(ua)) return "firefox";
  return "other";
}

/**
 * POST /api/v1/vault/redeem — public, no-session route: the Rules.md #11
 * exception. A receiving doctor off-platform has no app account; access is
 * gated by the short-lived, rate-limited share code alone.
 */
export const redeemShare: ApiHandler = async (request) => {
  const parsed = redeemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await redeemShareCode(parsed.data.code, {
    ipHash: hashIp(ip),
    userAgentCoarse: coarseUserAgent(request.headers.get("user-agent")),
  });

  if (!result.ok) {
    const status = result.reason === "expired" ? 410 : 404;
    const message =
      result.reason === "expired"
        ? "This share has expired or was revoked — ask the patient for a new one."
        : "This code doesn't match a share. Check it and try again.";
    return Response.json({ error: message }, { status });
  }

  const { ok: _ok, ...data } = result;
  return Response.json(data);
};
