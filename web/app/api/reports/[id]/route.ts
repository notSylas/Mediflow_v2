import { nextRoute } from "~backend/api/http";
import { downloadReport } from "~backend/api/reports";

export const GET = nextRoute(downloadReport);
