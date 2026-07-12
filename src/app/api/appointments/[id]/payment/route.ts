import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireSession } from "@/lib/auth/api-auth";
import { getAppointmentForPatient } from "@/lib/booking/appointments";
import {
  confirmAppointmentPayment,
  getPaymentProvider,
  getRazorpayClient,
} from "@/lib/payments/payments";

/**
 * Starts payment for a held appointment.
 * - mock provider (no Razorpay keys): confirms the booking directly.
 * - razorpay: creates an order for Checkout; confirmation happens in the
 *   verify endpoint / webhook.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getAppointmentForPatient(id, access.id);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { appointment, payment } = row;

  if (appointment.status !== "pending_payment") {
    return NextResponse.json(
      { error: "This appointment isn't awaiting payment" },
      { status: 400 }
    );
  }

  if (!appointment.holdExpiresAt || appointment.holdExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "Your slot hold has expired. Please pick a new slot." },
      { status: 410 }
    );
  }

  const provider = getPaymentProvider();

  if (provider === "mock") {
    const confirmed = await confirmAppointmentPayment(id);
    return NextResponse.json({ provider, appointment: confirmed });
  }

  const amountInPaise = payment?.amountInPaise ?? 0;
  if (amountInPaise <= 0) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  // Reuse the existing order if the patient retries (e.g. closed the popup).
  let orderId = payment?.orderId ?? null;
  if (!orderId) {
    const order = await getRazorpayClient().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: id,
      notes: { appointmentId: id },
    });
    orderId = order.id;

    await db
      .update(payments)
      .set({ orderId, updatedAt: new Date() })
      .where(eq(payments.appointmentId, id));
  }

  return NextResponse.json({
    provider,
    orderId,
    keyId: process.env.RAZORPAY_KEY_ID,
    amountInPaise,
    currency: "INR",
    name: access.name,
    email: access.email,
  });
}
