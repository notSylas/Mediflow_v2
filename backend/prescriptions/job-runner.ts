import { logger } from "~backend/core/logger";
import { failAnalysis, recordJobExecution } from "./analysis";

/**
 * Triggers the prescription-analyzer Cloud Run Job for one analysis.
 *
 * Cloud Run's `jobs.run` API starts an execution and returns immediately — it
 * does not wait for the container. That is the whole point here: the vision
 * passes take 20-60s, far longer than a request should hold, so the upload
 * endpoint fires this and returns, and the browser polls the row's status.
 *
 * The job writes its own terminal state back to `prescription_analyses`, so
 * nothing in Node has to watch the execution. We only record the execution
 * name for traceability, and fail the row here if the job could not even be
 * launched — otherwise it would sit `queued` forever with the UI spinning.
 *
 * Auth uses the runtime service account's metadata-server token, which is
 * present on Cloud Run without any key material. Locally there is no metadata
 * server, so `runAnalysisJob` is a no-op unless ANALYZER_JOB_NAME is set —
 * see `docs/Deployment.md` for the local path.
 */

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

function jobConfig() {
  const project = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT;
  const region = process.env.ANALYZER_JOB_REGION ?? "asia-south1";
  const job = process.env.ANALYZER_JOB_NAME;
  return { project, region, job };
}

/** True when the deployment is wired to run analyses. */
export function analyzerAvailable(): boolean {
  const { project, job } = jobConfig();
  return Boolean(project && job);
}

async function accessToken(): Promise<string> {
  const res = await fetch(METADATA_TOKEN_URL, {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (!res.ok) {
    throw new Error(`metadata token request failed: ${res.status}`);
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("metadata token response had no access_token");
  return body.access_token;
}

/**
 * Starts the job. Never throws: a failure to launch is recorded on the row so
 * the UI shows a real error instead of an endless spinner.
 */
export async function runAnalysisJob(analysisId: string): Promise<void> {
  const { project, region, job } = jobConfig();

  if (!project || !job) {
    logger.warn(
      { analysisId },
      "analyzer job not configured (ANALYZER_JOB_NAME/GOOGLE_CLOUD_PROJECT unset)"
    );
    await failAnalysis(
      analysisId,
      "Prescription analysis isn't configured on this server yet."
    );
    return;
  }

  const url =
    `https://run.googleapis.com/v2/projects/${project}/locations/${region}` +
    `/jobs/${job}:run`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      // Container overrides pass the row id to this execution only; the job's
      // deployed configuration is untouched, so concurrent uploads each get
      // their own execution.
      body: JSON.stringify({
        overrides: {
          containerOverrides: [
            { env: [{ name: "ANALYSIS_ID", value: analysisId }] },
          ],
          taskCount: 1,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`jobs.run ${res.status}: ${detail.slice(0, 500)}`);
    }

    // The operation name embeds the execution, e.g.
    // ".../operations/prescription-analyzer-abc12".
    const body = (await res.json()) as { name?: string; metadata?: { name?: string } };
    const execution = body.metadata?.name ?? body.name ?? "unknown";
    await recordJobExecution(analysisId, execution);
    logger.info({ analysisId, execution }, "prescription analysis job started");
  } catch (error) {
    logger.error(
      { analysisId, err: error instanceof Error ? error.message : String(error) },
      "could not start prescription analysis job"
    );
    await failAnalysis(
      analysisId,
      "Couldn't start the analysis. Please try uploading again."
    );
  }
}
