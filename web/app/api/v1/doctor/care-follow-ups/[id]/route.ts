import { nextRoute } from "~backend/api/http";
import { actOnCareFollowUp } from "~backend/api/v1/doctor-care";

export const POST = nextRoute(actOnCareFollowUp);
