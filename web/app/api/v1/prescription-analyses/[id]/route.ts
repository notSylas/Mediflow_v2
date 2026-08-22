import { nextRoute } from "~backend/api/http";
import { getAnalysis } from "~backend/api/v1/prescription-analyzer";

export const GET = nextRoute(getAnalysis);
