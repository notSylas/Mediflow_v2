import { nextRoute } from "~backend/api/http";
import { getDoctorAppointments } from "~backend/api/v1/doctor";

export const GET = nextRoute(getDoctorAppointments);
