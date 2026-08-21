import { nextRoute } from "~backend/api/http";
import { readDoctorProfile, updateDoctorProfile } from "~backend/api/doctor";

export const GET = nextRoute(readDoctorProfile);
export const PATCH = nextRoute(updateDoctorProfile);
