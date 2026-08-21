import { nextRoute } from "~backend/api/http";
import { getConsultNote, saveConsultNote } from "~backend/api/consult";

export const GET = nextRoute(getConsultNote);
export const PUT = nextRoute(saveConsultNote);
