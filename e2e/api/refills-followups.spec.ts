import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";
import { db } from "@/db";
import { appointments, doctorProfiles, prescriptions, user } from "@/db/schema";
import { DOCTOR_EMAIL, signIn, signInDoctorWithAvailability, signOut } from "../helpers";

/**
 * State machines for the refill and follow-up features, exercised through the
 * REST API with prerequisite rows (appointment, issued prescription) seeded
 * directly — the full clinical flow that produces them is covered in
 * consult.spec.ts.
 */

async function userId(email: string): Promise<string> {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  return u.id;
}

// A safely-in-the-past slot so seeds never collide with "now" async consults.
const seedStart = () => new Date(Date.now() - 60 * 60 * 1000);

test("refill: create (no duplicate pending), doctor fulfils via async consult", async ({ page }) => {
  await signInDoctorWithAvailability(page); // provisions the single doctor profile
  await signOut(page);
  const [doctor] = await db.select().from(doctorProfiles).limit(1);

  const patientEmail = `e2e+${Date.now()}-rx@example.com`;
  await signIn(page, patientEmail);
  const patientId = await userId(patientEmail);

  const start = seedStart();
  const [appt] = await db
    .insert(appointments)
    .values({ doctorId: doctor.id, patientId, startsAt: start, endsAt: start, status: "completed", mode: "async" })
    .returning();
  const [rx] = await db
    .insert(prescriptions)
    .values({ appointmentId: appt.id, patientId, doctorId: doctor.id, diagnosis: "Hypertension", status: "issued", issuedAt: start })
    .returning();

  // Patient requests a refill, twice — the second must not create a duplicate.
  expect((await page.request.post("/api/v1/patient/refill-requests", { data: { prescriptionId: rx.id } })).status()).toBe(201);
  expect((await page.request.post("/api/v1/patient/refill-requests", { data: { prescriptionId: rx.id } })).status()).toBe(201);
  await signOut(page);

  // Doctor sees exactly one pending request.
  await signIn(page, DOCTOR_EMAIL);
  const listRes = await page.request.get("/api/v1/doctor/refill-requests");
  expect(listRes.ok()).toBeTruthy();
  const { requests } = (await listRes.json()) as { requests: { id: string }[] };
  expect(requests.length).toBe(1);

  // Fulfilling opens an async consult and clears the pending request.
  const fulfilRes = await page.request.post(`/api/v1/doctor/refill-requests/${requests[0].id}/fulfill`);
  expect(fulfilRes.status()).toBe(201);
  expect((await fulfilRes.json()).appointmentId).toBeTruthy();

  const afterRes = await page.request.get("/api/v1/doctor/refill-requests");
  expect(((await afterRes.json()) as { requests: unknown[] }).requests.length).toBe(0);
});

test("follow-up: doctor recommends, only the owning patient can act on it", async ({ page }) => {
  await signInDoctorWithAvailability(page);
  await signOut(page);
  const [doctor] = await db.select().from(doctorProfiles).limit(1);

  const patientEmail = `e2e+${Date.now()}-fu@example.com`;
  await signIn(page, patientEmail);
  const patientId = await userId(patientEmail);

  const start = seedStart();
  const [appt] = await db
    .insert(appointments)
    .values({ doctorId: doctor.id, patientId, startsAt: start, endsAt: start, status: "completed", mode: "async" })
    .returning();
  await signOut(page);

  // Doctor recommends a follow-up off the source visit.
  await signIn(page, DOCTOR_EMAIL);
  const createRes = await page.request.post("/api/v1/follow-ups", { data: { appointmentId: appt.id, inDays: 7 } });
  expect(createRes.status()).toBe(201);
  const { followUp } = (await createRes.json()) as { followUp: { id: string } };
  await signOut(page);

  // A different patient cannot dismiss it (scoped update -> 404).
  await signIn(page, `e2e+${Date.now()}-intruder@example.com`);
  const intruderRes = await page.request.patch(`/api/v1/follow-ups/${followUp.id}`, { data: { status: "dismissed" } });
  expect(intruderRes.status()).toBe(404);
  await signOut(page);

  // The owning patient can.
  await signIn(page, patientEmail);
  const dismissRes = await page.request.patch(`/api/v1/follow-ups/${followUp.id}`, { data: { status: "dismissed" } });
  expect(dismissRes.status()).toBe(200);
});
