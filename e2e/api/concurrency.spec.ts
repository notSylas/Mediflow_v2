import { expect, test } from "@playwright/test";
import { signIn, signInDoctorWithAvailability, signOut } from "../helpers";

/**
 * The double-booking guarantee rests on the partial unique index
 * `uq_appointments_doctor_slot`, not on application code. Fire many concurrent
 * booking requests for the *same* slot and assert exactly one is created and
 * the rest are cleanly rejected (409) — proving the DB serialises the race and
 * the connection pool survives the burst.
 */
test("concurrent bookings for one slot: exactly one wins", async ({ page }) => {
  await signInDoctorWithAvailability(page);
  await signOut(page);

  await signIn(page, `e2e+${Date.now()}-concurrency@example.com`);

  const slotsRes = await page.request.get("/api/slots");
  expect(slotsRes.ok()).toBeTruthy();
  const { slots } = (await slotsRes.json()) as { slots: string[] };
  expect(slots.length).toBeGreaterThan(0);

  const N = 8;
  const payload = {
    startsAt: slots[0],
    visitReason: "general-consultation",
    symptoms: "Concurrency race booking.",
    consent: true,
  };

  const results = await Promise.all(
    Array.from({ length: N }, () =>
      page.request.post("/api/appointments", { data: payload })
    )
  );
  const statuses = results.map((r) => r.status());

  const created = statuses.filter((s) => s === 201).length;
  const conflicted = statuses.filter((s) => s === 409).length;

  expect(created, `statuses: ${statuses.join(",")}`).toBe(1);
  expect(conflicted).toBe(N - 1);
  // No request should have errored (e.g. pool exhaustion / 500).
  expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);

  // The server is still responsive after the burst — pool wasn't exhausted.
  const health = await page.request.get("/api/slots");
  expect(health.ok()).toBeTruthy();
});
