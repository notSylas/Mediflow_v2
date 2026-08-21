import { nextRoute } from "~backend/api/http";
import { createShare, listSharesHandler } from "~backend/api/v1/vault";

export const GET = nextRoute(listSharesHandler);
export const POST = nextRoute(createShare);
