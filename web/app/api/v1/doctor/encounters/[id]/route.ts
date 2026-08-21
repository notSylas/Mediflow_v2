import { nextRoute } from "~backend/api/http";
import { getEncounter } from "~backend/api/v1/doctor";

export const GET = nextRoute(getEncounter);
