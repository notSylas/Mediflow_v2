import { nextRoute } from "~backend/api/http";
import { pushAnalysisToVault } from "~backend/api/v1/prescription-analyzer";

export const POST = nextRoute(pushAnalysisToVault);
