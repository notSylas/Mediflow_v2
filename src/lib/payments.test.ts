import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "./payments";

const SECRET = "test_secret";

describe("verifyCheckoutSignature", () => {
  const valid = createHmac("sha256", SECRET)
    .update("order_abc|pay_xyz")
    .digest("hex");

  it("accepts a correctly signed checkout callback", () => {
    expect(
      verifyCheckoutSignature(
        { orderId: "order_abc", paymentId: "pay_xyz", signature: valid },
        SECRET
      )
    ).toBe(true);
  });

  it("rejects a tampered payment id", () => {
    expect(
      verifyCheckoutSignature(
        { orderId: "order_abc", paymentId: "pay_other", signature: valid },
        SECRET
      )
    ).toBe(false);
  });

  it("rejects a wrong-length signature without throwing", () => {
    expect(
      verifyCheckoutSignature(
        { orderId: "order_abc", paymentId: "pay_xyz", signature: "short" },
        SECRET
      )
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  const valid = createHmac("sha256", SECRET).update(body).digest("hex");

  it("accepts a correctly signed webhook body", () => {
    expect(verifyWebhookSignature(body, valid, SECRET)).toBe(true);
  });

  it("rejects a modified body", () => {
    expect(verifyWebhookSignature(body + " ", valid, SECRET)).toBe(false);
  });
});
