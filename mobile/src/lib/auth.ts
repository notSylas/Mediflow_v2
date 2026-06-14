import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BACKEND_PORT = 3000;

/**
 * The backend base URL.
 * - Production builds set EXPO_PUBLIC_API_URL explicitly.
 * - In dev we derive it from the same machine Expo Go connected to
 *   (`hostUri` is like "192.168.1.26:8081"), so it never goes stale when the
 *   laptop's LAN IP changes. `localhost` is only a last resort (simulators).
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // older Expo Go shapes
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost;

  const host = hostUri?.split(":")[0];
  return host ? `http://${host}:${BACKEND_PORT}` : "http://localhost:3000";
}

export const API_URL = resolveApiUrl();

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    emailOTPClient(),
    expoClient({
      scheme: "mediflow",
      storagePrefix: "mediflow",
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signOut } = authClient;

export type Role = "patient" | "doctor";
