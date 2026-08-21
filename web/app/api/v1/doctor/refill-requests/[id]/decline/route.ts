import { nextRoute } from "~backend/api/http";
import { declineRefillRequest } from "~backend/api/v1/doctor-care";

export const POST = nextRoute(declineRefillRequest);
