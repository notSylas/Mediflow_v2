import { nextRoute } from "~backend/api/http";
import { registerAsDoctor } from "~backend/api/doctor-signup";

export const POST = nextRoute(registerAsDoctor);
