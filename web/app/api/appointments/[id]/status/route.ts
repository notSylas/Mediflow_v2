import { nextRoute } from "~backend/api/http";
import { updateAppointmentStatus } from "~backend/api/appointments";

export const POST = nextRoute(updateAppointmentStatus);
