import { nextRoute } from "~backend/api/http";
import { cancelAppointment } from "~backend/api/appointments";

export const POST = nextRoute(cancelAppointment);
