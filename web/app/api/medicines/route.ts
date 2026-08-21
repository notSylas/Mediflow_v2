import { nextRoute } from "~backend/api/http";
import { searchMedicines } from "~backend/api/medicines";

export const GET = nextRoute(searchMedicines);
