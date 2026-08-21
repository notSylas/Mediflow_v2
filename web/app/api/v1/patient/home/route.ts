import { nextRoute } from "~backend/api/http";
import { getPatientHome } from "~backend/api/v1/patient";

export const GET = nextRoute(getPatientHome);
