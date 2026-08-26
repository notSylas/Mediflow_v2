import { nextRoute } from "~backend/api/http";
import { uploadVerificationDocument } from "~backend/api/doctor-verification";

export const POST = nextRoute(uploadVerificationDocument);
