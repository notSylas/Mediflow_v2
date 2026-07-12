/**
 * Extracts a Postgres error code (e.g. "23505" = unique_violation) from a
 * thrown query error. Drizzle wraps the driver's PostgresError, so the code can
 * sit on the error itself OR on its `cause` — checking only `error.code` misses
 * the wrapped case and turns a recoverable conflict into a 500.
 */
export function pgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

/** True when the error is a Postgres unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}
