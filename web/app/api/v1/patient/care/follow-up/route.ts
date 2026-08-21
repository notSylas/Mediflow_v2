import { nextRoute } from "~backend/api/http";
import { requestCareFollowUp } from "~backend/api/v1/patient";

export const POST = nextRoute(requestCareFollowUp);
