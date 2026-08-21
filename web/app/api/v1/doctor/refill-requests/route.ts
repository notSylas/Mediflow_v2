import { nextRoute } from "~backend/api/http";
import { listRefillRequests } from "~backend/api/v1/doctor-care";

export const GET = nextRoute(listRefillRequests);
