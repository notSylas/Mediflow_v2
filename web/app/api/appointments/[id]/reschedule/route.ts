import { nextRoute } from "~backend/api/http";
import { rescheduleAppointment } from "~backend/api/appointments";

export const POST = nextRoute(rescheduleAppointment);
