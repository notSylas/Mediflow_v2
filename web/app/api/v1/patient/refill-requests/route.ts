import { nextRoute } from "~backend/api/http";
import { requestRefill } from "~backend/api/v1/patient";

export const POST = nextRoute(requestRefill);
