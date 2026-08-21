import { nextRoute } from "~backend/api/http";
import { startAppointmentPayment } from "~backend/api/appointments";

export const POST = nextRoute(startAppointmentPayment);
