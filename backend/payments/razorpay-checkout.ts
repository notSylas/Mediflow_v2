"use client";

// Thin client-side wrapper around Razorpay Checkout. Loads the script on
// demand and resolves with the success payload, or rejects on dismiss/failure.

export interface CheckoutOptions {
  keyId: string;
  orderId: string;
  amountInPaise: number;
  currency: string;
  name: string;
  email: string;
}

export interface CheckoutResult {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

async function loadScript(): Promise<void> {
  if (window.Razorpay) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script failed"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  options: CheckoutOptions
): Promise<CheckoutResult> {
  await loadScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay failed to load");
  }

  return new Promise<CheckoutResult>((resolve, reject) => {
    const instance = new window.Razorpay!({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountInPaise,
      currency: options.currency,
      name: "MediFlow",
      description: "Video consultation",
      prefill: { name: options.name, email: options.email },
      handler: (response: RazorpaySuccessResponse) => {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error("dismissed")),
      },
    });

    instance.on("payment.failed", () => reject(new Error("failed")));
    instance.open();
  });
}
