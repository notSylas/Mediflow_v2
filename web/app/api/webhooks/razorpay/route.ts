import { nextRoute } from "~backend/api/http";
import { razorpayWebhook } from "~backend/api/webhooks";

export const POST = nextRoute(razorpayWebhook);
