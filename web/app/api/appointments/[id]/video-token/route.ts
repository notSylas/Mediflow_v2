import { nextRoute } from "~backend/api/http";
import { mintVideoToken } from "~backend/api/video";

export const POST = nextRoute(mintVideoToken);
