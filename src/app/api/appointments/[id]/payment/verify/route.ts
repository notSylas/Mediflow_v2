import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { getAppointmentForPatient } from "@/lib/appointments";
import { confirmAppointmentPayment, verifyCheckoutSignature } from "@/lib/payments";

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

/** Confirms a booking from Razorpay Checkout's success callback. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getAppointmentForPatient(id, access.id);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = verifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (row.payment?.orderId !== parsed.data.razorpayOrderId) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  const valid = verifyCheckoutSignature(
    {
      orderId: parsed.data.razorpayOrderId,
      paymentId: parsed.data.razorpayPaymentId,
      signature: parsed.data.razorpaySignature,
    },
    process.env.RAZORPAY_KEY_SECRET ?? ""
  );

  if (!valid) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const appointment = await confirmAppointmentPayment(
    id,
    parsed.data.razorpayPaymentId
  );

  return NextResponse.json({ appointment });
}
