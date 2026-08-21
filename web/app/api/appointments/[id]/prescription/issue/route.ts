import { nextRoute } from "~backend/api/http";
import { issuePrescription } from "~backend/api/consult";

export const POST = nextRoute(issuePrescription);
