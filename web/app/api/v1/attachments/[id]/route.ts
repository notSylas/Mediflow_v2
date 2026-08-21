import { nextRoute } from "~backend/api/http";
import { downloadAttachment } from "~backend/api/v1/conversations";

export const GET = nextRoute(downloadAttachment);
