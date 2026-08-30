import { nextRoute } from "~backend/api/http";
import { acceptTerms } from "~backend/api/account";

export const POST = nextRoute(acceptTerms);
