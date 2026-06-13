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
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("patient", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("new user signs up with a password, then signs back in with it", async ({
  page,
}) => {
  const email = `e2e+${Date.now()}-signup@example.com`;
  const password = "supersecret123";

  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test Patient");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/patient/);

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole("button", { name: "Password" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
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

  await page.getByRole("link", { name: /book a consultation/i }).click();
  await expect(page).toHaveURL(/\/patient\/book/);

  await page.getByLabel("Tell us more").fill("Just a checkup.");
  await page.getByRole("button", { name: /continue to pick a time/i }).click();

  await expect(
    page.getByText("No upcoming slots are available", { exact: false })
  ).toHaveCount(0);
  await expect(page.getByText("Choose a time")).toBeVisible();
});
