import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { logger } from "@/lib/logger";
import { confirmAppointmentPayment, verifyWebhookSignature } from "@/lib/payments";

/**
 * Razorpay server-to-server webhook. The authoritative confirmation path —
 * Checkout's client callback can be lost (tab closed), this can't.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    logger.warn("razorpay webhook with invalid signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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

  return NextResponse.json({ received: true });
}
