import { nextRoute } from "~backend/api/http";
import { confirmShareHandler } from "~backend/api/v1/vault";

export const POST = nextRoute(confirmShareHandler);
