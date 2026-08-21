import { nextRoute } from "~backend/api/http";
import { createFollowUpHandler } from "~backend/api/v1/follow-ups";

export const POST = nextRoute(createFollowUpHandler);
