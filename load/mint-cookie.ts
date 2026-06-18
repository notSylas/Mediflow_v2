/**
 * Mints a real session cookie for k6 load tests: runs the email-OTP sign-in
 * flow against a running server, reading the OTP straight from the DB (dev logs
 * it to the console / stores it in `verification`). Prints the Cookie header.
 *
 * Usage: LOAD_BASE_URL=http://localhost:3100 \
 *        DATABASE_URL=...mediflow_test tsx load/mint-cookie.ts
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { verification } from "@/db/schema";

const BASE = process.env.LOAD_BASE_URL ?? "http://localhost:3100";
const email = process.env.LOAD_EMAIL ?? `load-${Date.now()}@example.com`;

async function main() {
  const send = await fetch(`${BASE}/api/auth/email-otp/send-verification-otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, type: "sign-in" }),
  });
  if (!send.ok) throw new Error(`send-otp ${send.status}: ${await send.text()}`);

  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, `sign-in-otp-${email}`))
    .orderBy(desc(verification.createdAt))
    .limit(1);
  if (!row) throw new Error(`no OTP found for ${email}`);
  const otp = row.value.split(":")[0];

  const verify = await fetch(`${BASE}/api/auth/sign-in/email-otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!verify.ok) throw new Error(`verify ${verify.status}: ${await verify.text()}`);

  const cookie = (verify.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("no Set-Cookie returned from sign-in");
  process.stdout.write(cookie);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(String(err));
    process.exit(1);
  });
