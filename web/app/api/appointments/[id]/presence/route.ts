import { nextRoute } from "~backend/api/http";
import { getPresence } from "~backend/api/video";

export const GET = nextRoute(getPresence);
