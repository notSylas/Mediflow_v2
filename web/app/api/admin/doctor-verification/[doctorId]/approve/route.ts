import { nextRoute } from "~backend/api/http";
import { approveDoctorVerification } from "~backend/api/admin-doctor-verification";

export const POST = nextRoute(approveDoctorVerification);
