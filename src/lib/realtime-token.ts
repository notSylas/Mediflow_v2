import { createHmac, timingSafeEqual } from "node:crypto";

// Compact signed token used to authenticate a socket connection. The socket
// server runs on a different origin than the cookie, so the client fetches one
// of these (via a cookie-authenticated route) and presents it on connect.
// Same idea as an Ably token — swap-friendly.

const SECRET = process.env.REALTIME_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "dev-realtime-secret";
const TTL_SECONDS = 60 * 60;

export interface RealtimeClaims {
  userId: string;
  role: "patient" | "doctor";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signRealtimeToken(claims: RealtimeClaims): string {
  const payload = b64url(
    JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })
  );
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyRealtimeToken(token: string): RealtimeClaims | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}
