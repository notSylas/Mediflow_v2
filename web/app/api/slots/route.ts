import { nextRoute } from "~backend/api/http";
import { getSlots } from "~backend/api/slots";

export const GET = nextRoute(getSlots);
