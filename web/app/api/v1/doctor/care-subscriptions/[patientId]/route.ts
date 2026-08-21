import { nextRoute } from "~backend/api/http";
import { updateCareSubscription } from "~backend/api/v1/doctor-care";

export const POST = nextRoute(updateCareSubscription);
