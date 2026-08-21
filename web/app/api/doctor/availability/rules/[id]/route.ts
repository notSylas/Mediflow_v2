import { nextRoute } from "~backend/api/http";
import { deleteAvailabilityRule } from "~backend/api/doctor";

export const DELETE = nextRoute(deleteAvailabilityRule);
