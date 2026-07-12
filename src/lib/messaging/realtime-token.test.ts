import { afterEach, describe, expect, it, vi } from "vitest";
import { signRealtimeToken, verifyRealtimeToken } from "@/lib/messaging/realtime-token";

describe("realtime token", () => {
  afterEach(() => vi.useRealTimers());

  it("round-trips signed claims", () => {
    const token = signRealtimeToken({ userId: "user-1", role: "patient" });
    expect(verifyRealtimeToken(token)).toEqual({
      userId: "user-1",
      role: "patient",
    });
  });

  it("rejects a tampered payload (signature no longer matches)", () => {
    const token = signRealtimeToken({ userId: "user-1", role: "doctor" });
    const sig = token.split(".")[1];
    const forgedPayload = Buffer.from(
      JSON.stringify({
        userId: "attacker",
        role: "doctor",
        exp: Math.floor(Date.now() / 1000) + 900,
      })
    ).toString("base64url");
    expect(verifyRealtimeToken(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyRealtimeToken("")).toBeNull();
    expect(verifyRealtimeToken("nonsense")).toBeNull();
    expect(verifyRealtimeToken("a.b.c")).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T00:00:00Z"));
    const token = signRealtimeToken({ userId: "user-1", role: "patient" });

    // Past the 15-minute TTL.
    vi.setSystemTime(new Date("2026-06-14T00:16:00Z"));
    expect(verifyRealtimeToken(token)).toBeNull();
  });
});
