import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import Razorpay from "razorpay";
import { db } from "@/db";
import { appointments, payments } from "@/db/schema";
import { logger } from "@/lib/logger";
import { sendBookingConfirmation } from "@/lib/notifications";

export type PaymentProvider = "razorpay" | "mock";

/** Razorpay when keys are configured, mock otherwise (dev and e2e). */
export function getPaymentProvider(): PaymentProvider {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? "razorpay"
    : "mock";
}

export function getRazorpayClient(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

function safeEqualHex(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Razorpay Checkout success callback: HMAC-SHA256(order_id|payment_id, key secret). */
export function verifyCheckoutSignature(
  options: {
    orderId: string;
    paymentId: string;
    signature: string;
  },
  keySecret: string
): boolean {
  const expected = createHmac("sha256", keySecret)
    .update(`${options.orderId}|${options.paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, options.signature);
}

/** Razorpay webhook: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/**
 * Marks an appointment paid and confirmed. Idempotent: a second call (e.g.
 * checkout callback and webhook racing) is a no-op. If the appointment was
 * already cancelled (hold expired and the slot was rebooked before payment
 * landed), the payment is recorded but the booking is NOT resurrected — the
 * money must be refunded manually; we log loudly for that case.
 */
export async function confirmAppointmentPayment(
  appointmentId: string,
  razorpayPaymentId?: string
) {
  const { appointment, newlyConfirmed } = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .for("update");

    if (!existing) return { appointment: null, newlyConfirmed: false };

    await tx
      .update(payments)
      .set({
        status: "paid",
        ...(razorpayPaymentId ? { paymentId: razorpayPaymentId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(payments.appointmentId, appointmentId));

    if (existing.status === "confirmed") {
      return { appointment: existing, newlyConfirmed: false };
    }

    if (existing.status !== "pending_payment") {
      logger.error(
        { appointmentId, status: existing.status, razorpayPaymentId },
        "payment captured for a non-pending appointment — manual refund needed"
      );
      return { appointment: existing, newlyConfirmed: false };
    }

    const [confirmed] = await tx
      .update(appointments)
      .set({ status: "confirmed", holdExpiresAt: null, updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId))
      .returning();

    return { appointment: confirmed, newlyConfirmed: true };
  });

  // Fire-and-forget: a failed email must never fail the payment.
  if (newlyConfirmed) {
    void sendBookingConfirmation(appointmentId);
  }

  return appointment;
}
