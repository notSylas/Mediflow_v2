import { nextRoute } from "~backend/api/http";
import {
  createAvailabilityOverride,
  listAvailabilityOverrides,
} from "~backend/api/doctor";

export const GET = nextRoute(listAvailabilityOverrides);
export const POST = nextRoute(createAvailabilityOverride);
