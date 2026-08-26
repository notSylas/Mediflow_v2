import { nextRoute } from "~backend/api/http";
import { listPendingVerifications } from "~backend/api/admin-doctor-verification";

export const GET = nextRoute(listPendingVerifications);
