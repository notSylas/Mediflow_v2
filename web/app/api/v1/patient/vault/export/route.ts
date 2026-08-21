import { nextRoute } from "~backend/api/http";
import { exportVaultHandler } from "~backend/api/v1/vault";

export const GET = nextRoute(exportVaultHandler);
