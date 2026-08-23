"""Cloud Run Job entrypoint: analyse one prescription, write the result back.

Unlike `api.py` (the local FastAPI server), this has no HTTP surface. It is
executed once per upload with ANALYSIS_ID set, does its work, and exits — the
shape Cloud Run Jobs expect. Exit code 0 means the row reached a terminal
state; non-zero tells Cloud Run the execution failed so it shows up as failed
in the console.

The uploaded bytes are read from, and the result written to, the
`prescription_analyses` row. Nothing transits object storage: the file is
already in Postgres (same approach as medical_reports), so the job needs
exactly one credential and leaves no copies behind.

Run locally:
    ANALYSIS_ID=<uuid> DATABASE_URL=postgres://... python job.py
"""

from __future__ import annotations

import json
import logging
import os
import sys
import tempfile

import psycopg
from psycopg.types.json import Json

from prescription_analyzer.analyzer import PrescriptionAnalyzer

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("prescription-analyzer.job")

SUFFIX_BY_MIME = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/tiff": ".tiff",
    "image/bmp": ".bmp",
}


def _connect() -> psycopg.Connection:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL is required")
    # Cloud Run mounts Cloud SQL as a unix socket; libpq reads that from the
    # ?host= parameter in the URL, so no special handling is needed here.
    return psycopg.connect(dsn, autocommit=True)


def _claim(conn: psycopg.Connection, analysis_id: str) -> tuple[bytes, str, str] | None:
    """Mark the row processing and return its file. Returns None if another
    execution already claimed it — makes a retried job idempotent rather than
    paying for a second vision pass."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE prescription_analyses
               SET status = 'processing',
                   started_at = now(),
                   attempts = attempts + 1
             WHERE id = %s
               AND status IN ('queued', 'processing')
         RETURNING data, filename, mime_type
            """,
            (analysis_id,),
        )
        return cur.fetchone()


def _succeed(conn: psycopg.Connection, analysis_id: str, result: dict) -> None:
    confidence = result.get("overall_confidence") or 0
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE prescription_analyses
               SET status = 'succeeded',
                   result = %s,
                   overall_confidence = %s,
                   error = NULL,
                   completed_at = now()
             WHERE id = %s
            """,
            (Json(result), int(round(float(confidence) * 100)), analysis_id),
        )


def _fail(conn: psycopg.Connection, analysis_id: str, message: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE prescription_analyses
               SET status = 'failed', error = %s, completed_at = now()
             WHERE id = %s
            """,
            (message[:2000], analysis_id),
        )


def run_analysis(conn: psycopg.Connection, analysis_id: str) -> int:
    """Claims one row, analyses it, writes back a terminal state. Shared by
    the Cloud Run Job entrypoint below and prescription-analyzer/dev_worker.py
    (the local dev stand-in for Cloud Run Jobs) — same logic either way."""
    try:
        row = _claim(conn, analysis_id)
        if row is None:
            # Already terminal, or the id does not exist. Not an error: a
            # retry landing here means the work is done.
            logger.info("analysis %s not claimable (already finished?)", analysis_id)
            return 0

        data, filename, mime_type = row
        suffix = SUFFIX_BY_MIME.get(mime_type) or os.path.splitext(filename or "")[1] or ".pdf"
        logger.info("analysing %s (%s, %d bytes)", analysis_id, mime_type, len(data))

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(data)
                tmp_path = tmp.name

            result = PrescriptionAnalyzer().analyze(tmp_path).model_dump()
            _succeed(conn, analysis_id, result)
            logger.info(
                "analysis %s succeeded: %d medication(s), confidence %.2f",
                analysis_id,
                len(result.get("medications") or []),
                result.get("overall_confidence") or 0.0,
            )
            return 0
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
    except Exception as exc:  # noqa: BLE001 - the row must reach a terminal state
        logger.exception("analysis %s failed", analysis_id)
        try:
            _fail(conn, analysis_id, f"{type(exc).__name__}: {exc}")
        except Exception:
            logger.exception("could not record the failure for %s", analysis_id)
        return 1


def main() -> int:
    analysis_id = os.environ.get("ANALYSIS_ID")
    if not analysis_id:
        logger.error("ANALYSIS_ID is required")
        return 2

    conn = _connect()
    try:
        return run_analysis(conn, analysis_id)
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
