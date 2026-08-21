import { nextRoute } from "~backend/api/http";
import { getDoctorHome } from "~backend/api/v1/doctor";

export const GET = nextRoute(getDoctorHome);
