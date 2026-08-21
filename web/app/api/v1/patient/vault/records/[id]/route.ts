import { nextRoute } from "~backend/api/http";
import { deleteRecord, getRecord, updateRecord } from "~backend/api/v1/vault";

export const GET = nextRoute(getRecord);
export const PATCH = nextRoute(updateRecord);
export const DELETE = nextRoute(deleteRecord);
