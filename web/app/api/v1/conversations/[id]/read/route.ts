import { nextRoute } from "~backend/api/http";
import { markRead } from "~backend/api/v1/conversations";

export const POST = nextRoute(markRead);
