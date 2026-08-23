import { GoogleAuth } from "google-auth-library";
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
 * Auth goes through Application Default Credentials, so one code path covers
 * both environments: on Cloud Run it picks up the runtime service account from
 * the metadata server, and locally it uses whatever
 * `gcloud auth application-default login` wrote. No key material either way.
 */

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function jobConfig() {
  // GOOGLE_CLOUD_PROJECT is set automatically on Cloud Run; locally it falls
  // back to whatever project ADC is pointed at, so `gcloud config set project`
  // is enough and there is nothing extra to put in .env.
  const project =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCP_PROJECT ??
    (await auth.getProjectId().catch(() => null));
  const region = process.env.ANALYZER_JOB_REGION ?? "asia-south1";
  const job = process.env.ANALYZER_JOB_NAME ?? "prescription-analyzer";
  return { project, region, job };
}

/** True when this process can reach a project to run the job in. */
export async function analyzerAvailable(): Promise<boolean> {
  const { project, job } = await jobConfig();
  return Boolean(project && job);
}

async function accessToken(): Promise<string> {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("no access token from Application Default Credentials");
  return token;
}

/**
 * Starts the job. Never throws: a failure to launch is recorded on the row so
 * the UI shows a real error instead of an endless spinner.
 */
export async function runAnalysisJob(analysisId: string): Promise<void> {
  const { project, region, job } = await jobConfig();

  if (!project || !job) {
    logger.warn(
      { analysisId },
      "analyzer job not configured — no GCP project resolved from env or ADC"
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
