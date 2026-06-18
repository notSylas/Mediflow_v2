import http from "k6/http";
import { check, sleep } from "k6";

// Load smoke for the hot authenticated read paths. Every request also forces a
// session lookup (DB hit), so this exercises the connection pool too.
const BASE = __ENV.BASE_URL || "http://localhost:3100";
const COOKIE = __ENV.COOKIE || "";

export const options = {
  scenarios: {
    reads: { executor: "constant-vus", vus: 20, duration: "20s" },
  },
  thresholds: {
    // Single-doctor app on local Postgres — generous but catches regressions.
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

const PATHS = ["/api/slots", "/api/v1/patient/home", "/api/appointments"];
const params = { headers: { Cookie: COOKIE } };

export default function () {
  for (const path of PATHS) {
    const res = http.get(`${BASE}${path}`, params);
    check(res, { "status is 200": (r) => r.status === 200 });
  }
  sleep(0.1);
}
