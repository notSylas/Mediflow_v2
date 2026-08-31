import pino from "pino";

export const logger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty" },
  // Defense-in-depth, not the primary control — call sites should never log
  // these fields to begin with. Catches an accidental future `logger.info({
  // otp, html, body, ... })` before it reaches stdout/a log aggregator.
  redact: {
    paths: ["otp", "*.otp", "html", "*.html", "body", "*.body", "password", "*.password"],
    censor: "[redacted]",
  },
});
