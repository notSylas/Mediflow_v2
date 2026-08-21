// Pure attachment authorization decisions, kept free of DB access so they can
// be unit-tested directly. Messaging access itself is subscription-gated in
// care-subscription-policy.ts / chat.ts.

export interface AttachmentOwnership {
  uploaderId: string;
  conversationId: string | null;
}

export interface SendContext {
  senderId: string;
  conversationId: string;
}

/**
 * An attachment may be sent only by the user who uploaded it, and only in the
 * conversation it was uploaded into. This stops a guessed/leaked attachment id
 * from being attached to another conversation to read someone else's file.
 */
export function attachmentUsableBy(
  attachment: AttachmentOwnership,
  ctx: SendContext
): boolean {
  return (
    attachment.uploaderId === ctx.senderId &&
    attachment.conversationId === ctx.conversationId
  );
}
