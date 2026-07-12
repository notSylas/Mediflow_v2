import { describe, expect, it } from "vitest";
import { attachmentUsableBy } from "@/lib/messaging/chat-policy";

describe("attachmentUsableBy", () => {
  const conversationId = "conv-1";

  it("allows the uploader to send it in the same conversation", () => {
    expect(
      attachmentUsableBy(
        { uploaderId: "u1", conversationId },
        { senderId: "u1", conversationId }
      )
    ).toBe(true);
  });

  it("rejects a sender who did not upload it (guessed/leaked id)", () => {
    expect(
      attachmentUsableBy(
        { uploaderId: "u1", conversationId },
        { senderId: "u2", conversationId }
      )
    ).toBe(false);
  });

  it("rejects reuse in a different conversation", () => {
    expect(
      attachmentUsableBy(
        { uploaderId: "u1", conversationId },
        { senderId: "u1", conversationId: "conv-2" }
      )
    ).toBe(false);
  });

  it("rejects an attachment not bound to any conversation", () => {
    expect(
      attachmentUsableBy(
        { uploaderId: "u1", conversationId: null },
        { senderId: "u1", conversationId }
      )
    ).toBe(false);
  });
});
