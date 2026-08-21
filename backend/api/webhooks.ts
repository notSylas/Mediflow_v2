import { eq } from "drizzle-orm";
import { db } from "~backend/db";
import { payments } from "~backend/db/schema";
import { logger } from "~backend/core/logger";
import {
  confirmAppointmentPayment,
  verifyWebhookSignature,
} from "~backend/payments/payments";
import type { ApiHandler } from "./http";

/**
 * POST /api/webhooks/razorpay — Razorpay server-to-server webhook. The
 * authoritative confirmation path: Checkout's client callback can be lost
 * (tab closed), this can't.
 *
 * Razorpay must be pointed at whichever origin serves this directly, never
 * through a proxy that could rewrite the body — the raw bytes must arrive
 * unchanged for HMAC verification.
 */
export const razorpayWebhook: ApiHandler = async (request) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    logger.warn("razorpay webhook with invalid signature rejected");
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    const orderId: string | undefined = payment?.order_id;

    if (orderId) {
      const [row] = await db
        .select({ appointmentId: payments.appointmentId })
        .from(payments)
        .where(eq(payments.orderId, orderId));

      if (row) {
        await confirmAppointmentPayment(row.appointmentId, payment?.id);
        logger.info(
          { appointmentId: row.appointmentId, orderId },
          "appointment confirmed via razorpay webhook"
        );
      } else {
        logger.warn({ orderId }, "razorpay webhook for unknown order");
      }
    }
  }

  if (event.event === "payment.failed") {
    const orderId: string | undefined = event.payload?.payment?.entity?.order_id;
    if (orderId) {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(payments.orderId, orderId));
    }
  }

  return Response.json({ received: true });
};
