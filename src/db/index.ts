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

// Exported so the realtime layer can use LISTEN/NOTIFY on the same Postgres.
export const sql =
  globalForDb.__mediflowSql && globalForDb.__mediflowDatabaseUrl === resolvedDatabaseUrl
    ? globalForDb.__mediflowSql
    : postgres(resolvedDatabaseUrl, {
        prepare: false,
        max: maxConnections,
        idle_timeout: 20,
        connect_timeout: 10,
      });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mediflowSql = sql;
  globalForDb.__mediflowDatabaseUrl = resolvedDatabaseUrl;
}

export const db = drizzle(sql, { schema });
