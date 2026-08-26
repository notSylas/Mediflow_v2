import { nextRoute } from "~backend/api/http";
import { getDiagram } from "~backend/api/v1/prescription-analyzer";

export const GET = nextRoute(getDiagram);
