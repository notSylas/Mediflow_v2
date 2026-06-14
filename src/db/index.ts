import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Exported so the realtime layer can use LISTEN/NOTIFY on the same Postgres.
export const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(sql, { schema });
