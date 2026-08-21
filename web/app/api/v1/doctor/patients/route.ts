import { nextRoute } from "~backend/api/http";
import { listPatients } from "~backend/api/v1/doctor";

export const GET = nextRoute(listPatients);
