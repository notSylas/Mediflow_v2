import { nextRoute } from "~backend/api/http";
import { rejectDoctorVerification } from "~backend/api/admin-doctor-verification";

export const POST = nextRoute(rejectDoctorVerification);
