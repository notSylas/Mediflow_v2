import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { confirmShare } from "@/lib/vault/vault-share";

const schema = z.object({
  grantId: z.string().uuid(),
  otp: z.string().min(1),
});

const REASON_STATUS: Record<string, number> = {
  not_found: 404,
  wrong_code: 400,
  expired: 410,
  locked: 423,
};

const REASON_MESSAGE: Record<string, string> = {
  not_found: "This share request wasn't found.",
  wrong_code: "That code doesn't match. Please check your email and try again.",
  expired: "This code has expired. Start the share again.",
  locked: "Too many wrong attempts — start the share again.",
};

/** Step 2 of Flow A — verifies the OTP, mints the encrypted bundle + share code. */
export async function POST(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await confirmShare(parsed.data.grantId, access.id, parsed.data.otp);
  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGE[result.reason] },
      { status: REASON_STATUS[result.reason] }
    );
  }

  const origin = new URL(request.url).origin;
  const qrPayload = `${origin}/vault/view?code=${result.shareCode}`;
  return NextResponse.json({
    shareCode: result.shareCode,
    qrPayload,
    expiresAt: result.expiresAt,
  });
}
