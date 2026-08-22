import { nextRoute } from "~backend/api/http";
import { listAnalysesHandler, uploadAnalysis } from "~backend/api/v1/prescription-analyzer";

export const GET = nextRoute(listAnalysesHandler);
export const POST = nextRoute(uploadAnalysis);
