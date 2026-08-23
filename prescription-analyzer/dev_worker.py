"""Dev-only local stand-in for the Cloud Run Job.

Locally/in docker-compose there's no GCP project to invoke, so job-runner.ts
leaves a new analysis row `queued` instead of calling Cloud Run Jobs (see
ANALYZER_MODE=local-worker in backend/prescriptions/job-runner.ts). This
polls for those rows and processes them with job.py's exact claim/analyze/
write-back logic (run_analysis) — same result, just triggered by polling
instead of a Cloud Run execution. Not part of the production image (see
.dockerignore) and never deployed.

Run:
    DATABASE_URL=postgres://... python dev_worker.py
"""

from __future__ import annotations

import logging
import os
import time

from job import _connect, run_analysis

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("prescription-analyzer.dev-worker")

POLL_SECONDS = float(os.environ.get("ANALYZER_POLL_SECONDS", "2"))


def main() -> None:
    conn = _connect()
    logger.info("dev analyzer worker started, polling every %ss", POLL_SECONDS)
    try:
        while True:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id FROM prescription_analyses"
                    " WHERE status = 'queued' ORDER BY created_at LIMIT 5"
                )
                rows = cur.fetchall()
            for (analysis_id,) in rows:
                run_analysis(conn, str(analysis_id))
            time.sleep(POLL_SECONDS)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
