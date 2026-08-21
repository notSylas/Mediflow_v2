import { nextRoute } from "~backend/api/http";
import { getDoctorSchedule } from "~backend/api/v1/doctor";

export const GET = nextRoute(getDoctorSchedule);
