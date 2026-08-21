import { nextRoute } from "~backend/api/http";
import { uploadAttachment } from "~backend/api/v1/conversations";

export const POST = nextRoute(uploadAttachment);
