import { nextRoute } from "~backend/api/http";
import { revokeShareHandler } from "~backend/api/v1/vault";

export const POST = nextRoute(revokeShareHandler);
