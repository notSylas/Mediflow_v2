import { nextRoute } from "~backend/api/http";
import { startAsyncConsult } from "~backend/api/v1/doctor-care";

export const POST = nextRoute(startAsyncConsult);
