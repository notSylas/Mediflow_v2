import { expect, test } from "@playwright/test";
import {
  bookFirstAvailableSlot,
  signIn,
  signInDoctorWithAvailability,
  signOut,
} from "../helpers";

test("care plan gates messaging and grants one monthly follow-up", async ({ page }) => {
  await signInDoctorWithAvailability(page);
  await signOut(page);

  const patientEmail = `e2e+care-${Date.now()}@example.com`;
  await signIn(page, patientEmail);

  const lockedBeforeBooking = await page.request.get("/api/v1/conversations");
  expect(lockedBeforeBooking.status()).toBe(403);

  await bookFirstAvailableSlot(page, "Routine care-plan gate check.");

  const lockedAfterPaidVisit = await page.request.get("/api/v1/conversations");
  expect(lockedAfterPaidVisit.status()).toBe(403);

  const startCare = await page.request.post("/api/v1/patient/care");
  expect(startCare.status()).toBe(201);
  const startBody = await startCare.json();
  expect(startBody.care.active).toBe(true);
  expect(startBody.care.followUpAvailable).toBe(true);

  const unlocked = await page.request.get("/api/v1/conversations");
  expect(unlocked.status()).toBe(200);
  const unlockedBody = await unlocked.json();
  const conversationId = unlockedBody.conversation.id;
  expect(conversationId).toBeTruthy();

  const followUp = await page.request.post("/api/v1/patient/care/follow-up", {
    data: { note: "Please review my symptoms this month." },
  });
  expect(followUp.status()).toBe(201);
  const followUpBody = await followUp.json();
  expect(followUpBody.request.id).toBeTruthy();

  const secondFollowUp = await page.request.post("/api/v1/patient/care/follow-up", {
    data: { note: "Second follow-up in the same period." },
  });
  expect(secondFollowUp.status()).toBe(409);

  const cancellation = await page.request.get("/api/v1/patient/care/cancellation");
  expect(cancellation.status()).toBe(200);
  const cancellationBody = await cancellation.json();
  expect(cancellationBody.breakdown.pricePaise).toBeGreaterThan(0);
  expect(cancellationBody.breakdown.refundWorkingDays).toBeGreaterThan(0);

  await signOut(page);
  await signInDoctorWithAvailability(page);

  const subscribers = await page.request.get("/api/v1/doctor/care-subscriptions");
  expect(subscribers.status()).toBe(200);
  const subscribersBody = await subscribers.json();
  expect(subscribersBody.activeCount).toBe(1);
  expect(
    subscribersBody.subscribers.some(
      (row: { patientEmail: string; active: boolean }) =>
        row.patientEmail === patientEmail && row.active
    )
  ).toBe(true);

  const workQueue = await page.request.get("/api/v1/doctor/work-queue");
  expect(workQueue.status()).toBe(200);
  const workQueueBody = await workQueue.json();
  expect(
    workQueueBody.careFollowUps.some(
      (row: { id: string }) => row.id === followUpBody.request.id
    )
  ).toBe(true);

  const fulfill = await page.request.post(
    `/api/v1/doctor/care-follow-ups/${followUpBody.request.id}`,
    { data: { action: "fulfill" } }
  );
  expect(fulfill.status()).toBe(201);
  const fulfillBody = await fulfill.json();
  expect(fulfillBody.appointmentId).toBeTruthy();

  await signOut(page);
  await signIn(page, patientEmail);

  const cancel = await page.request.delete("/api/v1/patient/care");
  expect(cancel.status()).toBe(200);
  const cancelBody = await cancel.json();
  expect(cancelBody.care.active).toBe(false);
  expect(cancelBody.care.status).toBe("cancelled");

  const lockedAfterCancel = await page.request.get("/api/v1/conversations");
  expect(lockedAfterCancel.status()).toBe(403);

  const staleThread = await page.request.get(
    `/api/v1/conversations/${conversationId}/messages`
  );
  expect(staleThread.status()).toBe(404);
});
