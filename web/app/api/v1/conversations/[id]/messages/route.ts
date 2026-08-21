import { nextRoute } from "~backend/api/http";
import { getMessages, postMessage } from "~backend/api/v1/conversations";

export const GET = nextRoute(getMessages);
export const POST = nextRoute(postMessage);
