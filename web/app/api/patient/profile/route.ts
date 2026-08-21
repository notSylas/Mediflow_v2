import { nextRoute } from "~backend/api/http";
import { readPatientProfile, updatePatientProfile } from "~backend/api/patient";

export const GET = nextRoute(readPatientProfile);
export const PUT = nextRoute(updatePatientProfile);
