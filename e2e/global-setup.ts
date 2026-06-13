import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Empties every table before a test run so specs are deterministic: exactly
 * one doctor profile exists (created by the specs via the shared
 * DOCTOR_EMAIL), and slot availability is exactly what each spec sets up.
 * Never points at production — e2e runs against the local dev database.
 */
export default async function globalSetup() {
  await db.execute(sql`
    TRUNCATE TABLE
      prescription_medicines,
      prescriptions,
      consult_notes,
      medical_reports,
      payments,
      appointments,
      availability_overrides,
      availability_rules,
      doctor_profiles,
      session,
      account,
      verification,
      "user"
    CASCADE
  `);
}
