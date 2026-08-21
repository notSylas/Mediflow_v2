import { nextRoute } from "~backend/api/http";
import { listPrescriptions } from "~backend/api/v1/patient";

export const GET = nextRoute(listPrescriptions);
