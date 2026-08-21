import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __mediflowSql?: ReturnType<typeof postgres>;
  __mediflowDatabaseUrl?: string;
};

const databaseUrl = process.env.DATABASE_URL;
const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

if (!databaseUrl && !isTest) {
  throw new Error("DATABASE_URL is required");
}

const resolvedDatabaseUrl =
  databaseUrl ?? "postgresql://postgres:postgres@localhost:5432/mediflow_test";

const maxConnections = Number.parseInt(
  process.env.POSTGRES_MAX_CONNECTIONS ??
    (process.env.NODE_ENV === "production" ? "10" : "5"),
  10
);

const poolOptions = {
  prepare: false,
  max: maxConnections,
  idle_timeout: 20,
  connect_timeout: 10,
};

/**
 * Cloud Run mounts the Cloud SQL connection as a unix socket and the standard
 * libpq spelling for that is `postgresql://user:pass@/db?host=/cloudsql/...`
 * — an empty host with the socket directory in the query string.
 *
 * postgres.js parses connection strings with Node's `new URL()`, which rejects
 * an empty host outright (`ERR_INVALID_URL`), so that form has to be unpacked
 * into explicit options instead of being passed through.
 */
function socketOptions(url: string) {
  const match = /^postgres(?:ql)?:\/\/([^:/@]+)(?::([^@]*))?@\/([^?]+)\?host=(.+)$/.exec(
    url
  );
  if (!match) return null;
  const [, username, password = "", database, host] = match;
  if (!host.startsWith("/")) return null;
  return {
    host: decodeURIComponent(host),
    database: decodeURIComponent(database),
    username: decodeURIComponent(username),
    password: decodeURIComponent(password),
    ...poolOptions,
  };
}

function connect(url: string) {
  const socket = socketOptions(url);
  return socket ? postgres(socket) : postgres(url, poolOptions);
}

// Exported so the realtime layer can use LISTEN/NOTIFY on the same Postgres.
export const sql =
  globalForDb.__mediflowSql && globalForDb.__mediflowDatabaseUrl === resolvedDatabaseUrl
    ? globalForDb.__mediflowSql
    : connect(resolvedDatabaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mediflowSql = sql;
  globalForDb.__mediflowDatabaseUrl = resolvedDatabaseUrl;
}

export const db = drizzle(sql, { schema });
