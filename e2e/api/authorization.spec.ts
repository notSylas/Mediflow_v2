import { expect, test } from "@playwright/test";
import { signIn, signInDoctorWithAvailability, signOut } from "../helpers";

/**
 * API-level authorization: every protected route rejects the unauthenticated,
 * doctor-only routes reject patients, and a patient can't read another
 * patient's data (IDOR). Uses Playwright's request context, which carries the
 * cookies set by `signIn`.
 */

const PROTECTED_GET_ROUTES = [
  "/api/appointments",
  "/api/slots",
  "/api/v1/patient/home",
  "/api/v1/doctor/home",
  "/api/v1/conversations",
  "/api/v1/doctor/refill-requests",
];

const DOCTOR_ONLY_GET_ROUTES = [
  "/api/v1/doctor/home",
  "/api/v1/doctor/patients",
  "/api/v1/doctor/refill-requests",
  "/api/doctor/availability/rules",
];

test("unauthenticated API requests are rejected with 401", async ({ request }) => {
  for (const path of PROTECTED_GET_ROUTES) {
    const res = await request.get(path);
    expect(res.status(), `${path} should require auth`).toBe(401);
  }
});

test("a patient cannot reach doctor-only routes (403)", async ({ page }) => {
  await signIn(page, `e2e+${Date.now()}-patient@example.com`);

  for (const path of DOCTOR_ONLY_GET_ROUTES) {
    const res = await page.request.get(path);
    expect(res.status(), `${path} should be doctor-only`).toBe(403);
  }
});

test("a patient cannot read another patient's appointment (IDOR)", async ({ page }) => {
  // Ensure the shared doctor exists with availability so a slot is bookable.
  await signInDoctorWithAvailability(page);
  await signOut(page);

  // Patient A books — a pending hold is enough to own an appointment row.
  const patientA = `e2e+${Date.now()}-a@example.com`;
  await signIn(page, patientA);

  const slotsRes = await page.request.get("/api/slots");
  expect(slotsRes.ok()).toBeTruthy();
  const { slots } = (await slotsRes.json()) as { slots: string[] };
  expect(slots.length).toBeGreaterThan(0);

  const createRes = await page.request.post("/api/appointments", {
    data: {
      startsAt: slots[0],
      visitReason: "general-consultation",
      symptoms: "Routine check, nothing urgent.",
      consent: true,
    },
  });
  expect(createRes.status()).toBe(201);
  const appointment = (await createRes.json()) as { id: string };

  // The owner can read it.
  const ownRes = await page.request.get(`/api/appointments/${appointment.id}`);
  expect(ownRes.status()).toBe(200);
  await signOut(page);

  // A different patient cannot — scoped lookups return 404, not the row.
  await signIn(page, `e2e+${Date.now()}-b@example.com`);
  const otherRes = await page.request.get(`/api/appointments/${appointment.id}`);
  expect(otherRes.status()).toBe(404);
});
