import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";
// Type-only — erased at build, so the server auth module never reaches the
// client bundle. It only supplies the shape of the custom user fields.
import type { auth } from "~backend/auth/auth";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, useSession } = authClient;
