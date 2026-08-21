import { nextRoute } from "~backend/api/http";
import { fulfillRefillRequest } from "~backend/api/v1/doctor-care";

export const POST = nextRoute(fulfillRefillRequest);
