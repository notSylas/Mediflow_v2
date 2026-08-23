import { nextRoute } from "~backend/api/http";
import { recordDoctorConsent } from "~backend/api/v1/vault";

export const POST = nextRoute(recordDoctorConsent);
