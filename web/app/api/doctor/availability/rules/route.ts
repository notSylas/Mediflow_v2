import { nextRoute } from "~backend/api/http";
import { createAvailabilityRule, listAvailabilityRules } from "~backend/api/doctor";

export const GET = nextRoute(listAvailabilityRules);
export const POST = nextRoute(createAvailabilityRule);
