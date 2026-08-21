import { nextRoute } from "~backend/api/http";
import { createRecord } from "~backend/api/v1/vault";

export const POST = nextRoute(createRecord);
