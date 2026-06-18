import { expect, test, type APIRequestContext } from "@playwright/test";
import { signIn } from "../helpers";

/**
 * Exhaustive guard coverage for every session-protected API route:
 *  - unauthenticated  -> 401 (auth check runs before any body parsing)
 *  - patient hitting a doctor-only route -> 403
 *
 * [id] routes use a dummy UUID; the guard fires before the row is ever looked
 * up, so a real id isn't needed. Specially-gated routes (Better Auth,
 * CRON_SECRET cron, HMAC webhook) are covered elsewhere / by config.
 */

const UID = "00000000-0000-0000-0000-000000000000";
type Route = [method: string, path: string];

// requireSession — any authenticated user. (slots is gated via getSession.)
const SESSION_ROUTES: Route[] = [
  ["GET", "/api/appointments"],
  ["GET", "/api/slots"],
  ["GET", "/api/patient/profile"],
  ["POST", "/api/reports"],
  ["GET", `/api/reports/${UID}`],
  ["GET", "/api/v1/conversations"],
  ["GET", `/api/v1/conversations/${UID}/messages`],
  ["POST", `/api/v1/conversations/${UID}/read`],
  ["POST", `/api/v1/conversations/${UID}/attachments`],
  ["GET", `/api/v1/attachments/${UID}`],
  ["GET", "/api/v1/patient/home"],
  ["GET", "/api/v1/patient/prescriptions"],
  ["POST", "/api/v1/patient/refill-requests"],
  ["PATCH", `/api/v1/follow-ups/${UID}`],
  ["GET", `/api/v1/patient/appointments/${UID}`],
  ["GET", "/api/v1/realtime/token"],
  ["GET", `/api/appointments/${UID}`],
  ["POST", `/api/appointments/${UID}/cancel`],
  ["POST", `/api/appointments/${UID}/payment`],
  ["POST", `/api/appointments/${UID}/payment/verify`],
  ["GET", `/api/appointments/${UID}/presence`],
  ["POST", `/api/appointments/${UID}/reschedule`],
  ["POST", `/api/appointments/${UID}/video-token`],
];

// requireDoctorSession — also rejects patients with 403.
const DOCTOR_ROUTES: Route[] = [
  ["GET", `/api/appointments/${UID}/consult-note`],
  ["POST", `/api/appointments/${UID}/prescription/issue`],
  ["PUT", `/api/appointments/${UID}/prescription`],
  ["POST", `/api/appointments/${UID}/status`],
  ["GET", "/api/doctor/availability/overrides"],
  ["DELETE", `/api/doctor/availability/overrides/${UID}`],
  ["GET", "/api/doctor/availability/rules"],
  ["DELETE", `/api/doctor/availability/rules/${UID}`],
  ["GET", "/api/doctor/next-consult"],
  ["GET", "/api/doctor/profile"],
  ["GET", "/api/v1/doctor/appointments"],
  ["POST", "/api/v1/doctor/async-consult"],
  ["GET", `/api/v1/doctor/encounters/${UID}`],
  ["GET", "/api/v1/doctor/home"],
  ["GET", "/api/v1/doctor/patients"],
  ["GET", `/api/v1/doctor/patients/${UID}`],
  ["POST", `/api/v1/doctor/refill-requests/${UID}/decline`],
  ["POST", `/api/v1/doctor/refill-requests/${UID}/fulfill`],
  ["GET", "/api/v1/doctor/refill-requests"],
  ["GET", "/api/v1/doctor/schedule"],
  ["GET", "/api/v1/doctor/work-queue"],
  ["POST", "/api/v1/follow-ups"],
];

function call(ctx: APIRequestContext, method: string, path: string) {
  switch (method) {
    case "GET":
      return ctx.get(path);
    case "POST":
      return ctx.post(path, { data: {} });
    case "PUT":
      return ctx.put(path, { data: {} });
    case "PATCH":
      return ctx.patch(path, { data: {} });
    case "DELETE":
      return ctx.delete(path);
    default:
      throw new Error(`unhandled method ${method}`);
  }
}

test("every protected route rejects the unauthenticated with 401", async ({ request }) => {
  for (const [method, path] of [...SESSION_ROUTES, ...DOCTOR_ROUTES]) {
    const res = await call(request, method, path);
    expect(res.status(), `${method} ${path}`).toBe(401);
  }
});

test("every doctor-only route rejects a patient with 403", async ({ page }) => {
  await signIn(page, `e2e+${Date.now()}-guard-patient@example.com`);
  for (const [method, path] of DOCTOR_ROUTES) {
    const res = await call(page.request, method, path);
    expect(res.status(), `${method} ${path}`).toBe(403);
  }
});
