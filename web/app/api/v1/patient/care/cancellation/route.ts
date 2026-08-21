import { nextRoute } from "~backend/api/http";
import { getCareCancellation } from "~backend/api/v1/patient";

export const GET = nextRoute(getCareCancellation);
