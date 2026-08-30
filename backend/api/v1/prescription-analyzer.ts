import { requireSession } from "~backend/auth/api-auth";
import {
  ALLOWED_ANALYSIS_TYPES,
  MAX_ANALYSIS_BYTES,
  createAnalysis,
  getAnalysisForUploader,
  getDiagramImage,
  getPageSnapshotImage,
  listAnalyses,
  listDiagrams,
  listPageSnapshots,
} from "~backend/prescriptions/analysis";
import { runAnalysisJob } from "~backend/prescriptions/job-runner";
import { createVaultRecordFromAnalysis } from "~backend/vault/vault-records";
import { verifyFileContentType } from "~backend/core/file-validation";
import type { ApiHandler } from "../http";

/**
 * POST /api/v1/prescription-analyses — upload a prescription for analysis.
 *
 * Returns 202 with a queued row rather than the result: the vision passes take
 * 20-60s, so the client polls the status endpoint. The Cloud Run Job is fired
 * after the row exists, so a launch failure has somewhere to be recorded.
 */
export const uploadAnalysis: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_ANALYSIS_TYPES.includes(file.type as (typeof ALLOWED_ANALYSIS_TYPES)[number])) {
    return Response.json(
      { error: "Upload a PDF or a photo (PNG, JPG, WEBP, TIFF, BMP)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_ANALYSIS_BYTES) {
    return Response.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!(await verifyFileContentType(buffer, ALLOWED_ANALYSIS_TYPES))) {
    return Response.json(
      { error: "File content doesn't match a supported PDF or photo format" },
      { status: 400 }
    );
  }

  const analysis = await createAnalysis({
    uploaderId: access.id,
    filename: file.name,
    mimeType: file.type,
    data: buffer,
  });

  // Fire-and-forget by design: jobs.run returns as soon as the execution is
  // accepted, and runAnalysisJob records its own failures on the row.
  await runAnalysisJob(analysis.id);

  return Response.json({ analysis }, { status: 202 });
};

/**
 * GET /api/v1/prescription-analyses/:id — poll one analysis.
 *
 * Returns the row without its file bytes; once `status` is succeeded the
 * `result` field carries the full structured extraction.
 */
export const getAnalysis: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const analysis = await getAnalysisForUploader(params.id, access.id);
  if (!analysis) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  // Diagrams and page snapshots ride along so the UI renders them in the
  // same poll that delivers the transcription — no second round trip once
  // the analysis succeeds.
  const [diagrams, pageSnapshots] =
    analysis.status === "succeeded"
      ? await Promise.all([
          listDiagrams(params.id, access.id),
          listPageSnapshots(params.id, access.id),
        ])
      : [[], []];
  return Response.json({ analysis: { ...analysis, diagrams, pageSnapshots } });
};

/**
 * GET /api/v1/prescription-diagrams/:id — the cropped drawing itself.
 *
 * Served as raw bytes on its own URL so the browser caches it and the polling
 * payload stays small. Ownership is checked through the parent analysis.
 */
export const getDiagram: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getDiagramImage(params.id, access.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mimeType,
      // Immutable: a crop never changes once the job has written it.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
};

/**
 * GET /api/v1/prescription-page-snapshots/:id — one rendered page of the
 * original document. Same shape as getDiagram — its own cacheable URL.
 */
export const getPageSnapshot: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getPageSnapshotImage(params.id, access.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
};

/** GET /api/v1/prescription-analyses — the caller's own analyses, newest first. */
export const listAnalysesHandler: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  return Response.json({ analyses: await listAnalyses(access.id) });
};

/**
 * POST /api/v1/prescription-analyses/:id/push-to-vault — the "Save to Vault"
 * bridge from the standalone analyzer page. Creates a new vault record
 * pre-filled from an already-succeeded analysis; the patient still lands on
 * the normal review/confirm screen — nothing here bypasses that step.
 */
export const pushAnalysisToVault: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const result = await createVaultRecordFromAnalysis(access.id, params.id);
  if (!result.record) {
    return Response.json({ error: result.error ?? "Couldn't save to vault" }, { status: 400 });
  }
  return Response.json({ vaultRecordId: result.record.id }, { status: 201 });
};
