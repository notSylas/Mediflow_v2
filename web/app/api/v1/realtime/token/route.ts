import { nextRoute } from "~backend/api/http";
import { getRealtimeToken } from "~backend/api/v1/realtime";

export const GET = nextRoute(getRealtimeToken);
