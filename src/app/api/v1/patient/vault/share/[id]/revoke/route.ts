import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { revokeShare } from "@/lib/vault/vault-share";

/** Immediate revoke — the next redeem attempt, even with the right code, fails from here on. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const revoked = await revokeShare(id, access.id);
  if (!revoked) {
    return NextResponse.json(
      { error: "This share isn't active, or doesn't belong to you." },
      { status: 409 }
    );
  }
  return NextResponse.json({ status: "revoked" });
}
