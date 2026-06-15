// Pure messaging/attachment authorization decisions, kept free of DB access so
// they can be unit-tested directly. The data layer (chat.ts) reads rows and
// delegates the *decisions* here.

/**
 * Appointment statuses that unlock messaging. A patient may message only once
 * they've actually paid for a consultation — an unpaid hold (`pending_payment`)
 * or a cancelled visit does not count. Confirmed/completed/no_show all imply a
 * successful payment occurred.
 */
const MESSAGING_BLOCKED_STATUSES = new Set(["pending_payment", "cancelled"]);

export function messagingAllowedForStatus(status: string): boolean {
  return !MESSAGING_BLOCKED_STATUSES.has(status);
}

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
