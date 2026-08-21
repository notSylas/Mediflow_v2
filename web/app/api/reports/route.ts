import { nextRoute } from "~backend/api/http";
import { uploadReport } from "~backend/api/reports";

export const POST = nextRoute(uploadReport);
