import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { emailLayout, sendEmail } from "@/lib/notifications/email";

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
  // Sign-in is email-OTP first (see the emailOTP plugin below) — that's the
  // only public-facing method. Email+password stays *enabled* so an
  // already-authenticated user can opt into a password from Account settings
  // (authClient.changePassword), but `disableSignUp` closes the public
  // password-account creation path at the source: a direct POST to
  // /sign-up/email is rejected, not just hidden in the UI. New accounts are
  // created implicitly on first OTP sign-in.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  // Anti-takeover notification for the change-email flow below. This hook
  // fires after the new-email OTP is verified but *before* the row is updated,
  // so `user.email` here is still the OLD address — the one place we can warn
  // the previous mailbox that its account was moved. Best-effort and never
  // throws: a failed notification must not block a legitimate change. Scoped
  // to the change-email endpoint so it doesn't fire on unrelated verification.
  emailVerification: {
    async beforeEmailVerification(user, request) {
      try {
        const path = request ? new URL(request.url).pathname : "";
        if (!path.endsWith("/email-otp/change-email")) return;
        await sendEmail({
          to: user.email,
          subject: "Your MediFlow sign-in email was changed",
          html: emailLayout(
            `<p>The email address used to sign in to your MediFlow account was just changed to a new address.</p>
             <p><strong>If you did this, no action is needed.</strong></p>
             <p>If you didn't request this, your account may have been accessed by someone else — reply to this email right away so we can help secure it.</p>`
          ),
        });
      } catch {
        // Best-effort: never block a legitimate email change on a notice that
        // failed to send (e.g. provider hiccup).
      }
    },
    async afterEmailVerification(user) {
      // Audit trail (Rule #11 — ids only, no PII). A confirmed email change is
      // a security-relevant event worth a durable log line.
      console.info(`[audit] email changed for user ${user.id}`);
    },
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
      // Lets an authenticated user move their account to a new email. The OTP
      // is sent to the *new* address (proving they control it); the previous
      // address is warned via beforeEmailVerification above. Safe by design:
      // doctor_profiles and every other relation reference user.id, never the
      // email string, so a change never breaks appointments/profile linkage.
      changeEmail: { enabled: true },
      async sendVerificationOTP({ email, otp, type }) {
        const isChangeEmail = type === "change-email";
        await sendEmail({
          to: email,
          subject: isChangeEmail
            ? `${otp} confirms your new MediFlow email`
            : `${otp} is your MediFlow sign-in code`,
          html: emailLayout(
            `<p>${
              isChangeEmail
                ? "Use this code to confirm this address as your new MediFlow sign-in email:"
                : "Your one-time sign-in code is:"
            }</p>
             <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f766e">${otp}</p>
             <p>It expires shortly. If you didn't request this, you can ignore this email.</p>`
          ),
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
