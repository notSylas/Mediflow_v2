import { existsSync, readFileSync } from "node:fs";

type Severity = "ok" | "missing" | "warn" | "blocker";

type Check = {
  key: string;
  severity: Severity;
  note: string;
};

process.loadEnvFile?.();

const strict = process.argv.includes("--strict");

function has(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function value(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function isLocalish(raw: string): boolean {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname)
    );
  } catch {
    return raw.includes("localhost") || raw.includes("127.0.0.1");
  }
}

function present(key: string, note: string): Check {
  return has(key)
    ? { key, severity: "ok", note }
    : { key, severity: "missing", note };
}

function recommended(key: string, note: string): Check {
  return has(key)
    ? { key, severity: "ok", note }
    : { key, severity: "warn", note };
}

function optional(key: string, note: string): Check {
  return has(key)
    ? { key, severity: "ok", note }
    : { key, severity: "warn", note };
}

function warning(key: string, note: string): Check {
  return { key, severity: "warn", note };
}

function blocker(key: string, note: string): Check {
  return { key, severity: "blocker", note };
}

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const raw = line.slice(index + 1).trim();
        const unquoted = raw.replace(/^['"]|['"]$/g, "");
        return [key, unquoted];
      })
  );
}

const checks: Record<string, Check[]> = {
  "App required": [
    present("DATABASE_URL", "Postgres connection string"),
    present("BETTER_AUTH_SECRET", "Auth/session signing secret"),
    present("BETTER_AUTH_URL", "Canonical production web origin"),
  ],
  "Launch required": [
    present("RAZORPAY_KEY_ID", "Razorpay Checkout key"),
    present("RAZORPAY_KEY_SECRET", "Razorpay server key"),
    present("RAZORPAY_WEBHOOK_SECRET", "Razorpay webhook signature secret"),
    present("LIVEKIT_URL", "LiveKit Cloud websocket URL"),
    present("LIVEKIT_API_KEY", "LiveKit API key"),
    present("LIVEKIT_API_SECRET", "LiveKit API secret"),
    present("RESEND_API_KEY", "Resend email API key"),
    present("EMAIL_FROM", "Verified Resend sender"),
    present("CRON_SECRET", "Reminder cron bearer secret"),
    present("NEXT_PUBLIC_REALTIME_URL", "Public realtime socket URL"),
  ],
  "Recommended": [
    recommended("POSTGRES_MAX_CONNECTIONS", "Small pool size for serverless DB"),
    recommended("LOG_LEVEL", "Use info in production"),
  ],
  "Optional integrations": [
    optional("GOOGLE_CLIENT_ID", "Google sign-in client ID"),
    optional("GOOGLE_CLIENT_SECRET", "Google sign-in client secret"),
    optional("SENTRY_DSN", "Server-side Sentry DSN"),
    optional("NEXT_PUBLIC_SENTRY_DSN", "Client-side Sentry DSN"),
  ],
};

if (has("DATABASE_URL") && isLocalish(value("DATABASE_URL"))) {
  checks["App required"].push(
    blocker("DATABASE_URL", "Production must use Neon/hosted Postgres, not local Docker")
  );
}

if (has("BETTER_AUTH_URL")) {
  const authUrl = value("BETTER_AUTH_URL");
  if (!authUrl.startsWith("https://")) {
    checks["App required"].push(
      blocker("BETTER_AUTH_URL", "Production auth URL must use HTTPS")
    );
  }
  if (isLocalish(authUrl)) {
    checks["App required"].push(
      blocker("BETTER_AUTH_URL", "Production auth URL must be the deployed domain")
    );
  }
}

if (has("BETTER_AUTH_SECRET") && value("BETTER_AUTH_SECRET").length < 32) {
  checks["App required"].push(
    warning("BETTER_AUTH_SECRET", "Use a long generated secret, ideally 32+ chars")
  );
}

if (has("CRON_SECRET") && value("CRON_SECRET").length < 24) {
  checks["Launch required"].push(
    warning("CRON_SECRET", "Use a long random value, ideally 24+ chars")
  );
}

if (has("POSTGRES_MAX_CONNECTIONS")) {
  const max = Number.parseInt(value("POSTGRES_MAX_CONNECTIONS"), 10);
  if (!Number.isFinite(max) || max < 1) {
    checks.Recommended.push(
      warning("POSTGRES_MAX_CONNECTIONS", "Must be a positive integer")
    );
  } else if (max > 10) {
    checks.Recommended.push(
      warning("POSTGRES_MAX_CONNECTIONS", "Keep this low for Neon/serverless")
    );
  }
}

checks["Realtime host"] = [
  has("REALTIME_SECRET")
    ? { key: "REALTIME_SECRET", severity: "ok", note: "Socket token secret" }
    : warning("REALTIME_SECRET", "Unset; realtime server will reuse BETTER_AUTH_SECRET"),
  recommended("REALTIME_ALLOWED_ORIGINS", "Browser origin allowlist for socket.io"),
  recommended("REALTIME_PORT", "Socket server listen port; defaults to 4000"),
];

const mobileEnv = parseEnvFile("mobile/.env");
checks["Mobile build"] = [
  mobileEnv.EXPO_PUBLIC_API_URL
    ? { key: "EXPO_PUBLIC_API_URL", severity: "ok", note: "Mobile API base URL" }
    : { key: "EXPO_PUBLIC_API_URL", severity: "warn", note: "Required for EAS builds" },
];

if (mobileEnv.EXPO_PUBLIC_API_URL && isLocalish(mobileEnv.EXPO_PUBLIC_API_URL)) {
  checks["Mobile build"].push(
    warning(
      "EXPO_PUBLIC_API_URL",
      "Current mobile URL is local/LAN; use production API URL for release builds"
    )
  );
}

function status(check: Check): string {
  if (check.severity === "ok") return "OK";
  if (check.severity === "warn") return "WARN";
  if (check.severity === "blocker") return "BLOCK";
  return "MISS";
}

let blockers = 0;
let missing = 0;
let warnings = 0;

console.log(`MediFlow production env audit${strict ? " (strict)" : ""}`);
console.log("Values are hidden; only presence and production safety are checked.\n");

for (const [section, sectionChecks] of Object.entries(checks)) {
  console.log(section);
  for (const check of sectionChecks) {
    if (check.severity === "blocker") blockers++;
    if (check.severity === "missing") missing++;
    if (check.severity === "warn") warnings++;
    console.log(`  ${status(check).padEnd(5)} ${check.key.padEnd(28)} ${check.note}`);
  }
  console.log("");
}

console.log(
  `Summary: ${blockers} blockers, ${missing} missing, ${warnings} warnings.`
);

if (strict && (blockers > 0 || missing > 0)) {
  console.error("Strict env check failed.");
  process.exit(1);
}
