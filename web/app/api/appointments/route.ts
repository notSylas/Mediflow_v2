import { nextRoute } from "~backend/api/http";
import { createAppointment, listAppointments } from "~backend/api/appointments";

export const GET = nextRoute(listAppointments);
export const POST = nextRoute(createAppointment);
