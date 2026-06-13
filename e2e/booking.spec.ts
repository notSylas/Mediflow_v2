import { test, expect } from "@playwright/test";
import {
  bookFirstAvailableSlot,
  signIn,
  signInDoctorWithAvailability,
  signOut,
} from "./helpers";

test("patient books a slot, confirms payment, and cancels it", async ({ page }) => {
  await signInDoctorWithAvailability(page);
  await signOut(page);

  const patientEmail = `e2e+${Date.now()}-patient@example.com`;
  await signIn(page, patientEmail);
  await expect(page).toHaveURL(/\/patient/);

  await bookFirstAvailableSlot(page, "Annual checkup, no major concerns.");

  // Appointments list shows it as confirmed, with a Cancel option.
  await page.getByRole("link", { name: /view my appointments/i }).click();
  await expect(page).toHaveURL(/\/patient\/appointments/);
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^cancel$/i }).click();
  await page.getByRole("button", { name: /cancel appointment/i }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});
