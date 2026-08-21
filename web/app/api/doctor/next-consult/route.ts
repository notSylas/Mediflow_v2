import { nextRoute } from "~backend/api/http";
import { getNextConsult } from "~backend/api/doctor";

export const GET = nextRoute(getNextConsult);
