import { nextRoute } from "~backend/api/http";
import { getPatientAppointment } from "~backend/api/v1/patient";

export const GET = nextRoute(getPatientAppointment);
