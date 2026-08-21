import { nextRoute } from "~backend/api/http";
import { listConversations } from "~backend/api/v1/conversations";

export const GET = nextRoute(listConversations);
