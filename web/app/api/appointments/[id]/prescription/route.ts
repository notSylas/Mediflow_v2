import { nextRoute } from "~backend/api/http";
import { savePrescription } from "~backend/api/consult";

export const PUT = nextRoute(savePrescription);
