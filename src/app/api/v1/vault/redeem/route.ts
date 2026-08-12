import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { redeemShareCode } from "@/lib/vault/vault-share";

// Public, no-session route — the Rules.md #11 exception. A receiving doctor
// off-platform has no app account; access is gated by the share code alone.

const schema = z.object({ code: z.string().min(1) });

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // Truncated hash: enough to spot repeat abuse patterns, not enough to be a
  // durable identifier — matches Rules.md #11's "no PII beyond what's needed".
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function coarseUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  if (/mobile/i.test(ua)) return "mobile";
  if (/edg/i.test(ua)) return "edge";
  if (/chrome/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  if (/firefox/i.test(ua)) return "firefox";
  return "other";
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await redeemShareCode(parsed.data.code, {
    ipHash: hashIp(ip),
    userAgentCoarse: coarseUserAgent(request.headers.get("user-agent")),
  });

  if (!result.ok) {
    const status = result.reason === "expired" ? 410 : 404;
    const message =
      result.reason === "expired"
        ? "This share has expired or was revoked — ask the patient for a new one."
        : "This code doesn't match a share. Check it and try again.";
    return NextResponse.json({ error: message }, { status });
  }

  const { ok: _ok, ...data } = result;
  return NextResponse.json(data);
}
