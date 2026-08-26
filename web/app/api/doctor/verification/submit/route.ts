import { nextRoute } from "~backend/api/http";
import { submitVerification } from "~backend/api/doctor-verification";

export const POST = nextRoute(submitVerification);
