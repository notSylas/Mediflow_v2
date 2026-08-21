import { nextRoute } from "~backend/api/http";
import { redeemShare } from "~backend/api/v1/vault";

export const POST = nextRoute(redeemShare);
