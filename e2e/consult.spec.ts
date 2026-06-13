import { test, expect } from "@playwright/test";
import {
  bookFirstAvailableSlot,
  signIn,
  signInDoctorWithAvailability,
  signOut,
} from "./helpers";

/**
 * The full clinic loop: book → doctor consults (SOAP + prescription) →
 * patient reads the outcome → books again → doctor sees returning-patient
 * history. One serial journey, mirroring docs/AppFlow.md.
 */
test("consultation, prescription, and returning-patient history", async ({ page }) => {
  test.setTimeout(120_000);

  await signInDoctorWithAvailability(page);
  await signOut(page);

  // --- First visit: patient books. ---
  const patientEmail = `e2e+${Date.now()}-consult@example.com`;
  await signIn(page, patientEmail);
  await bookFirstAvailableSlot(page, "Sore throat and mild fever for two days.");
  await signOut(page);

  // --- Doctor runs the consultation. ---
  await signIn(page, "e2e-doctor@example.com");
  await page.goto("/doctor/appointments");
  await page.locator('a[href^="/doctor/encounter/"]').first().click();
  await expect(page).toHaveURL(/\/doctor\/encounter\//);

  // Intake is visible, and this is a first visit.
  await expect(page.getByText("Sore throat and mild fever for two days.")).toBeVisible();
  await expect(page.getByText(/first visit — no history/i)).toBeVisible();

  // Video can't run in CI (LiveKit unconfigured) — the join button exists
  // but the consult itself proceeds regardless.

  // SOAP note.
  await page.getByLabel("Subjective").fill("Sore throat, 2 days, mild fever.");
  await page.getByLabel("Objective").fill("Throat erythema, no exudate. Temp 99.8F reported.");
  await page.getByLabel("Assessment").fill("Acute viral pharyngitis");
  await page.getByLabel("Plan").fill("Symptomatic care, hydration, review if worse in 3 days.");
  // The note autosaves ~1.5s after typing stops.
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  // Structured prescription.
  await page.getByLabel("Diagnosis").fill("Acute viral pharyngitis");
  await page.getByLabel("Medicine 1 name").fill("Paracetamol");
  await page.getByLabel("Medicine 1 strength").fill("500 mg");
  await page.getByText("morning", { exact: true }).click();
  await page.getByText("night", { exact: true }).click();
  await page.getByLabel("Medicine 1 food relation").selectOption("After food");
  await page.getByLabel("Medicine 1 duration in days").fill("3");
  await page.getByLabel("Advice").fill("Warm fluids. Rest your voice.");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /issue prescription/i }).click();
  await expect(page.getByText("Issued", { exact: true })).toBeVisible();
  await expect(page.getByText(/locked and can('|’)t be edited/i)).toBeVisible();

  // Outcome.
  await page.getByRole("button", { name: /mark completed/i }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await signOut(page);

  // --- Patient sees the prescription. ---
  await signIn(page, patientEmail);
  await page.goto("/patient/prescriptions");
  await expect(page.getByText("Acute viral pharyngitis").first()).toBeVisible();
  await expect(page.getByText("Paracetamol")).toBeVisible();
  await expect(page.getByText(/Morning, Night · After food · 3 days/)).toBeVisible();

  // Appointment detail shows the outcome too.
  await page.getByRole("link", { name: /view appointment/i }).click();
  await expect(page.getByText("Your prescription")).toBeVisible();

  // --- Second visit: returning patient. ---
  await bookFirstAvailableSlot(page, "Follow-up: throat is better, cough remains.");
  await signOut(page);

  await signIn(page, "e2e-doctor@example.com");
  await page.goto("/doctor/appointments");
  // The confirmed (newest) appointment links from the top of the list.
  await page.locator('a[href^="/doctor/encounter/"]').first().click();

  await expect(page.getByText("Returning patient")).toBeVisible();
  await expect(page.getByText("Past consultations")).toBeVisible();
  await expect(page.getByText(/Assessment: Acute viral pharyngitis/)).toBeVisible();
  await expect(page.getByText("Medicine history")).toBeVisible();
  // Appears in both the past-consult list and the medicine history panel.
  await expect(page.getByText("Paracetamol").first()).toBeVisible();
});
