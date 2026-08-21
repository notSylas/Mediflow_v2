import { nextRoute } from "~backend/api/http";
import { listCareSubscriptions } from "~backend/api/v1/doctor-care";

export const GET = nextRoute(listCareSubscriptions);
