import { nextRoute } from "~backend/api/http";
import { sendDueReminders } from "~backend/api/cron";

export const GET = nextRoute(sendDueReminders);
