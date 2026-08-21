import { nextRoute } from "~backend/api/http";
import { updateFollowUpStatus } from "~backend/api/v1/follow-ups";

export const PATCH = nextRoute(updateFollowUpStatus);
