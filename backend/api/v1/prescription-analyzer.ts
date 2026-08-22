import { requireSession } from "~backend/auth/api-auth";
import {
  ALLOWED_ANALYSIS_TYPES,
  MAX_ANALYSIS_BYTES,
  createAnalysis,
  getAnalysisForUploader,
  listAnalyses,
} from "~backend/prescriptions/analysis";
import { runAnalysisJob } from "~backend/prescriptions/job-runner";
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

  const analysis = await createAnalysis({
    uploaderId: access.id,
    filename: file.name,
    mimeType: file.type,
    data: Buffer.from(await file.arrayBuffer()),
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
  return Response.json({ analysis });
};

/** GET /api/v1/prescription-analyses — the caller's own analyses, newest first. */
export const listAnalysesHandler: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  return Response.json({ analyses: await listAnalyses(access.id) });
};
