import { nextRoute } from "~backend/api/http";
import { cancelCare, getCare, startCare, updateCare } from "~backend/api/v1/patient";

export const GET = nextRoute(getCare);
export const POST = nextRoute(startCare);
export const DELETE = nextRoute(cancelCare);
export const PATCH = nextRoute(updateCare);
