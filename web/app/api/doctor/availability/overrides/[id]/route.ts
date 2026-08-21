import { nextRoute } from "~backend/api/http";
import { deleteAvailabilityOverride } from "~backend/api/doctor";

export const DELETE = nextRoute(deleteAvailabilityOverride);
