import { nextRoute } from "~backend/api/http";
import { uploadDoctorSignature } from "~backend/api/doctor";

export const POST = nextRoute(uploadDoctorSignature);
