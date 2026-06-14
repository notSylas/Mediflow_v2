import { API_URL, authClient } from "@/lib/auth";

/**
 * Authenticated fetch against the MediFlow backend. The Better Auth Expo
 * client stores the session cookie in SecureStore; we attach it manually
 * because React Native has no shared cookie jar.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const cookie = authClient.getCookie();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const cookie = authClient.getCookie();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "omit",
    headers: cookie ? { Cookie: cookie } : undefined,
    body,
  });

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const responseBody = await res.json();
      if (typeof responseBody?.error === "string") message = responseBody.error;
    } catch {
      // Keep the status-based message for non-JSON responses.
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}
