import { test, expect } from "@playwright/test";
import {
  getSignInOtp,
  signIn,
  signInDoctorWithAvailability,
  signOut,
} from "./helpers";

test("login, land on patient home, then logout", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;

  // Guests see the public landing page at "/" and reach login from it.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /see your doctor without/i })
  ).toBeVisible();
  await page.getByRole("link", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send code/i }).click();

  await expect(page.getByLabel("Verification code")).toBeVisible();

  const otp = await getSignInOtp(email);
  await page.getByLabel("Verification code").fill(otp);
  await page.getByRole("button", { name: /verify & sign in/i }).click();

  await expect(page).toHaveURL(/\/patient/);
  // The sidebar shows the email in both the name line and the sub-line.
  await expect(page.getByText(email).first()).toBeVisible();
  await expect(page.getByText("patient", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("a non-staff account is blocked at the clinic sign-in", async ({ page }) => {
  // Sign-in is shared backend, but the /doctor/login surface confirms the
  // account is actually a doctor after OTP and, when it isn't, shows an
  // explicit message instead of dropping a patient into the clinic UI.
  const email = `e2e+${Date.now()}-wrongrole@example.com`;

  await page.goto("/doctor/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(page.getByLabel("Verification code")).toBeVisible();

  const otp = await getSignInOtp(email);
  await page.getByLabel("Verification code").fill(otp);
  await page.getByRole("button", { name: /verify & sign in/i }).click();

  // No auto-redirect — the explicit message and a route to their own portal.
  await expect(page.getByText(/isn't set up for clinic access/i)).toBeVisible();
  await page.getByRole("link", { name: /patient portal/i }).click();
  await expect(page).toHaveURL(/\/patient/);
});

test("authenticated users are redirected away from /login", async ({ page }) => {
  const email = `e2e+${Date.now()}-2@example.com`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(page.getByLabel("Verification code")).toBeVisible();

  const otp = await getSignInOtp(email);
  await page.getByLabel("Verification code").fill(otp);
  await page.getByRole("button", { name: /verify & sign in/i }).click();
  await expect(page).toHaveURL(/\/patient/);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/patient/);
});

test("doctor sets weekly availability and patient sees a matching slot", async ({
  page,
}) => {
  await signInDoctorWithAvailability(page);
  await signOut(page);

  const patientEmail = `e2e+${Date.now()}-patient@example.com`;
  await signIn(page, patientEmail);
  await expect(page).toHaveURL(/\/patient/);

  // The redesigned patient home surfaces the CTA more than once (hero + card).
  await page.getByRole("link", { name: /book a consultation/i }).first().click();
  await expect(page).toHaveURL(/\/patient\/book/);

  await page.getByLabel("Tell us more").fill("Just a checkup.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /continue to pick a time/i }).click();

  await expect(
    page.getByText("No upcoming slots are available", { exact: false })
  ).toHaveCount(0);
  await expect(page.getByText("Choose a time")).toBeVisible();
});
