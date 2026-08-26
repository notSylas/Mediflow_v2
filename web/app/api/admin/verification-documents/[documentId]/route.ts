import { nextRoute } from "~backend/api/http";
import { downloadVerificationDocument } from "~backend/api/admin-doctor-verification";

export const GET = nextRoute(downloadVerificationDocument);
