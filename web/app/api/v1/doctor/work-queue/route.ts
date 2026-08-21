import { nextRoute } from "~backend/api/http";
import { getWorkQueue } from "~backend/api/v1/doctor";

export const GET = nextRoute(getWorkQueue);
