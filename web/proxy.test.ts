import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "./proxy";

function makeRequest(path: string, { sessionCookie }: { sessionCookie?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (sessionCookie) {
    headers.cookie = "better-auth.session_token=test-token";
  }
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("proxy", () => {
  it("redirects unauthenticated users to /login with redirectTo", () => {
    const response = proxy(makeRequest("/patient"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirectTo")).toBe("/patient");
  });

  it("allows unauthenticated users to access /login", () => {
    const response = proxy(makeRequest("/login"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows unauthenticated users to access nested public paths", () => {
    const response = proxy(makeRequest("/login/foo"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows login access when a stale session cookie is present", () => {
    const response = proxy(makeRequest("/login", { sessionCookie: true }));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows authenticated users to access protected paths", () => {
    const response = proxy(makeRequest("/patient", { sessionCookie: true }));

    expect(response.headers.get("location")).toBeNull();
  });
});
