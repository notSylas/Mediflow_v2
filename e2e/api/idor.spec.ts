import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";
import { db } from "@/db";
import { appointments, doctorProfiles, medicalReports, user } from "@/db/schema";
import { signIn, signInDoctorWithAvailability, signOut } from "../helpers";

/**
 * Cross-patient access (IDOR) on the owner-scoped `[id]` routes: patient B must
 * not read OR mutate patient A's appointment, appointment detail, or medical
 * report. Patient A is inserted directly (we only need a user to own the
 * seeded rows — no session), and B attempts the access with a real session.
 */
test("a patient cannot read or mutate another patient's appointment or report", async ({ page }) => {
  await signInDoctorWithAvailability(page);
  await signOut(page);
  const [doctor] = await db.select().from(doctorProfiles).limit(1);

  const patientA = `idor-a-${Date.now()}`;
  await db
    .insert(user)
    .values({ id: patientA, name: "Patient A", email: `${patientA}@example.com` });

  const start = new Date(Date.now() - 60 * 60 * 1000);
  const [appt] = await db
    .insert(appointments)
    .values({ doctorId: doctor.id, patientId: patientA, startsAt: start, endsAt: start, status: "confirmed", mode: "video" })
    .returning();
  const [report] = await db
    .insert(medicalReports)
    .values({ patientId: patientA, filename: "a-private-report.pdf", mimeType: "application/pdf", data: Buffer.from("PRIVATE A") })
    .returning();

  // Patient B — must be denied on every one of A's resources.
  await signIn(page, `e2e+${Date.now()}-idor-b@example.com`);

  expect((await page.request.get(`/api/v1/patient/appointments/${appt.id}`)).status(), "read A's appointment").toBe(404);
  expect((await page.request.post(`/api/appointments/${appt.id}/cancel`, { data: {} })).status(), "cancel A's appointment").toBe(404);
  // The reports route denies non-owner/non-doctor with 403 (vs 404 elsewhere) —
  // either way the data is never returned.
  expect((await page.request.get(`/api/reports/${report.id}`)).status(), "download A's report").toBe(403);

  // And A's appointment is untouched by B's cancel attempt.
  const [after] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, appt.id));
  expect(after.status, "A's appointment must remain confirmed").toBe("confirmed");
});
