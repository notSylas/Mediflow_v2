import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { emailLayout, sendEmail } from "@/lib/email";

const PRIVATE_LAN_HOSTS = [
  "10.*.*.*:3000",
  "172.16.*.*:3000",
  "172.17.*.*:3000",
  "172.18.*.*:3000",
  "172.19.*.*:3000",
  "172.20.*.*:3000",
  "172.21.*.*:3000",
  "172.22.*.*:3000",
  "172.23.*.*:3000",
  "172.24.*.*:3000",
  "172.25.*.*:3000",
  "172.26.*.*:3000",
  "172.27.*.*:3000",
  "172.28.*.*:3000",
  "172.29.*.*:3000",
  "172.30.*.*:3000",
  "172.31.*.*:3000",
  "192.168.*.*:3000",
];

const DEV_AUTH_HOSTS = ["localhost:3000", "127.0.0.1:3000", ...PRIVATE_LAN_HOSTS];
const DEV_AUTH_ORIGINS = DEV_AUTH_HOSTS.map((host) => `http://${host}`);
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  ...(!isProduction
    ? {
        // In dev, the same server is often opened as localhost in one browser
        // and as a LAN IP from a phone. Resolve auth URLs from safe local hosts
        // so cookies/callbacks match the host being used.
        baseURL: {
          allowedHosts: DEV_AUTH_HOSTS,
          protocol: "http" as const,
          fallback: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        },
      }
    : {}),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // The mobile app authenticates against this same server. Its custom scheme
  // and (in dev) Expo's exp:// origin must be trusted for cross-origin auth.
  trustedOrigins: [
    "mediflow://",
    ...(!isProduction ? ["exp://", ...DEV_AUTH_ORIGINS] : []),
  ],
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
    expo(),
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
