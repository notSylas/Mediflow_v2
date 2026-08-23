import { nextRoute } from "~backend/api/http";
import { previewShareHandler } from "~backend/api/v1/vault";

export const GET = nextRoute(previewShareHandler);
