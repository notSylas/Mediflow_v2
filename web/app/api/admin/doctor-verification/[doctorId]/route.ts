import { nextRoute } from "~backend/api/http";
import { getDoctorVerification } from "~backend/api/admin-doctor-verification";

export const GET = nextRoute(getDoctorVerification);
