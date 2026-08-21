import { nextRoute } from "~backend/api/http";
import { getVault } from "~backend/api/v1/vault";

export const GET = nextRoute(getVault);
