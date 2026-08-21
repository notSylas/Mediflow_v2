import { nextRoute } from "~backend/api/http";
import { getAppointment } from "~backend/api/appointments";

export const GET = nextRoute(getAppointment);
