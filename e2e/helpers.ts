import { desc, eq } from "drizzle-orm";
import type { Page } from "@playwright/test";
import { db } from "~backend/db";
import { user, verification } from "~backend/db/schema";

/**
 * The one doctor every spec shares. `getDoctorProfile()` returns the first
 * profile row, so all specs must funnel through a single doctor account —
 * a per-spec doctor would never be "the" doctor patients book with.
 */
export const DOCTOR_EMAIL = "e2e-doctor@example.com";

/**
 * Email-OTP sign-in. Returns once the role-based redirect has landed.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  await page.getByLabel("Verification code").waitFor();

  const otp = await getSignInOtp(email);
  await page.getByLabel("Verification code").fill(otp);
  await page.getByRole("button", { name: /verify & sign in/i }).click();
  await page.waitForURL(/\/(patient|doctor)/);
}

/**
 * Fills the identity fields booking requires (full name, date of birth,
 * gender). Video consultations are gated on these so the doctor can prescribe
 * safely and the prescription carries valid patient details — see
 * `getBookingProfileMissing` in backend/people/patient-readiness.ts. Without
 * this, `/patient/book` renders "Complete profile before booking" instead of
 * the intake form and every booking spec times out.
 *
 * Driven through the API rather than the profile form: these specs are about
 * booking, not about the form's Select widgets, and `page.request` reuses the
 * browser's session cookie.
 */
export async function completePatientProfile(page: Page): Promise<void> {
  const response = await page.request.put("/api/patient/profile", {
    data: {
      name: "E2E Test Patient",
      dateOfBirth: "1990-01-01",
      gender: "female",
    },
  });
  if (!response.ok()) {
    throw new Error(
      `completePatientProfile failed: ${response.status()} ${await response.text()}`
    );
  }
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: /log out/i }).click();
  await page.waitForURL(/\/login/);
}

/**
 * Signs the shared doctor in, promotes the account if needed, and ensures
 * an all-day availability rule exists so any spec can book a slot. Leaves
 * the doctor signed in on /doctor.
 */
export async function signInDoctorWithAvailability(page: Page): Promise<void> {
  await signIn(page, DOCTOR_EMAIL);
  await setUserRole(DOCTOR_EMAIL, "doctor");

  await page.goto("/doctor/settings");
  await page.waitForURL(/\/doctor\/settings/);

  // The range can render in more than one place (list + summary), so scope to
  // the first match to stay out of strict-mode trouble.
  const existing = page.getByText("00:00 – 23:40").first();
  if (await existing.isVisible().catch(() => false)) return;

  await page.getByLabel("Start").fill("00:00");
  await page.getByLabel("End").fill("23:40");
  await page.getByRole("button", { name: /add range/i }).click();
  await existing.waitFor();
}

/**
 * Books the first available slot as the signed-in patient (assumes the
 * shared doctor has availability). Ends on the confirmation step (mock
 * payment provider).
 *
 * Returns the new appointment's id. Specs that then act as the doctor should
 * navigate to it directly rather than clicking the first row of
 * /doctor/appointments — the suite shares one doctor and one database, so by
 * the later specs that list holds appointments from earlier ones and "first"
 * is whichever slot sorts earliest, not necessarily this booking.
 */
export async function bookFirstAvailableSlot(
  page: Page,
  symptoms: string
): Promise<string> {
  await completePatientProfile(page);
  await page.goto("/patient/book");
  await page.getByLabel("Tell us more").fill(symptoms);
  // Consent is required before continuing.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /continue to pick a time/i }).click();

  await page.getByText("Choose a time").waitFor();
  await page.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM)$/ }).first().click();

  await page.waitForURL(/\/patient\/book\?appointment=/);
  const appointmentId = new URL(page.url()).searchParams.get("appointment");
  if (!appointmentId) {
    throw new Error(`no appointment id in booking URL: ${page.url()}`);
  }

  await page.getByRole("button", { name: /pay & confirm booking/i }).click();
  await page.getByText(/consultation is confirmed/i).waitFor();

  return appointmentId;
}

/**
 * Reads the most recently issued sign-in OTP for an email directly from the
 * `verification` table. Mirrors better-auth's `toOTPIdentifier("sign-in", email)`
 * (`sign-in-otp-<email>`) and its plain `"<otp>:<attempts>"` value format.
 */
export async function getSignInOtp(email: string): Promise<string> {
  const identifier = `sign-in-otp-${email}`;
  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .orderBy(desc(verification.createdAt))
    .limit(1);

  if (!row) {
    throw new Error(`No OTP found for ${email}`);
  }

  const [otp] = row.value.split(":");
  return otp;
}

/**
 * Sets a user's role directly in the database. There's no role-switching
 * UI, so tests that need a doctor account promote a freshly signed-up
 * user this way.
 */
export async function setUserRole(
  email: string,
  role: "doctor" | "patient"
): Promise<void> {
  await db.update(user).set({ role }).where(eq(user.email, email));
}
