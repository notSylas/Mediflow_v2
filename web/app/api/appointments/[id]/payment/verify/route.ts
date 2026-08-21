import { nextRoute } from "~backend/api/http";
import { verifyAppointmentPayment } from "~backend/api/appointments";

export const POST = nextRoute(verifyAppointmentPayment);
