import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { emailLayout, sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Defaults to enabled in production. The Playwright suite runs against a
  // production build and signs in multiple users in quick succession, so it
  // opts out via DISABLE_RATE_LIMIT (set in playwright.config.ts).
  rateLimit: {
    enabled:
      process.env.DISABLE_RATE_LIMIT === "true"
        ? false
        : process.env.NODE_ENV === "production",
  },
  // Email + password sign-up/sign-in. Email-OTP (below) stays available as a
  // passwordless alternative on the same login page. Verification email is
  // wired in milestone 5 (Resend); accounts are usable immediately for now.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "patient",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: `${otp} is your MediFlow sign-in code`,
          html: emailLayout(
            `<p>Your one-time sign-in code is:</p>
             <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f766e">${otp}</p>
             <p>It expires shortly. If you didn't request this, you can ignore this email.</p>`
          ),
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
