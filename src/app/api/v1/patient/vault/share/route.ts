import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { vaultEncryptionAvailable } from "@/lib/vault/vault-crypto";
import { ALLOWED_DURATION_MINUTES } from "@/lib/vault/vault-share-policy";
import { createPendingShare, listShares } from "@/lib/vault/vault-share";

const schema = z.object({
  scope: z.enum(["everything", "last_6_months"]),
  durationMinutes: z.union([
    z.literal(ALLOWED_DURATION_MINUTES[0]),
    z.literal(ALLOWED_DURATION_MINUTES[1]),
    z.literal(ALLOWED_DURATION_MINUTES[2]),
  ]),
});

/** Step 1 of Flow A — starts a share, sends the self-confirm OTP. */
export async function POST(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  if (!vaultEncryptionAvailable()) {
    return NextResponse.json(
      { error: "Vault sharing isn't available right now. Please try again shortly." },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { grantId, otpSentTo } = await createPendingShare(
    access.id,
    parsed.data.scope,
    parsed.data.durationMinutes
  );
  return NextResponse.json({ grantId, otpSentTo }, { status: 201 });
}

/** Patient's own share history — active/expired/revoked grants + view counts. */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const grants = await listShares(access.id);
  return NextResponse.json({ grants });
}
