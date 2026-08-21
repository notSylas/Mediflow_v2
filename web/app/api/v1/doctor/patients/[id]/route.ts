import { nextRoute } from "~backend/api/http";
import { getPatient } from "~backend/api/v1/doctor";

export const GET = nextRoute(getPatient);
