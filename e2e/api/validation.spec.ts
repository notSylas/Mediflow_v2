import { expect, test } from "@playwright/test";
import { signIn, signInDoctorWithAvailability } from "../helpers";

/** Zod request-validation: malformed payloads are rejected with 400 before any
 * business logic runs. */

const futureSlot = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

test("rejects invalid booking payloads (400)", async ({ page }) => {
  await signIn(page, `e2e+${Date.now()}-vb@example.com`);

  const badPayloads = [
    { startsAt: "not-a-date", visitReason: "general-consultation", symptoms: "ok", consent: true },
    { startsAt: futureSlot(), visitReason: "not-a-real-reason", symptoms: "ok", consent: true },
    { startsAt: futureSlot(), visitReason: "general-consultation", symptoms: "", consent: true },
    // Consent must be explicitly true.
    { startsAt: futureSlot(), visitReason: "general-consultation", symptoms: "ok", consent: false },
  ];

  for (const data of badPayloads) {
    const res = await page.request.post("/api/appointments", { data });
    expect(res.status(), JSON.stringify(data)).toBe(400);
  }
});

test("rejects out-of-range follow-up inDays (400)", async ({ page }) => {
  await signInDoctorWithAvailability(page); // doctor session

  for (const inDays of [0, 400, -5]) {
    const res = await page.request.post("/api/v1/follow-ups", {
      data: { appointmentId: "00000000-0000-0000-0000-000000000000", inDays },
    });
    expect(res.status(), `inDays=${inDays}`).toBe(400);
  }
});

test("rejects a non-uuid refill prescriptionId (400)", async ({ page }) => {
  await signIn(page, `e2e+${Date.now()}-vr@example.com`);

  const res = await page.request.post("/api/v1/patient/refill-requests", {
    data: { prescriptionId: "not-a-uuid" },
  });
  expect(res.status()).toBe(400);
});
