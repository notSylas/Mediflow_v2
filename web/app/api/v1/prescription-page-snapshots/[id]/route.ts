import { nextRoute } from "~backend/api/http";
import { getPageSnapshot } from "~backend/api/v1/prescription-analyzer";

export const GET = nextRoute(getPageSnapshot);
