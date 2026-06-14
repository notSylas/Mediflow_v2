"use client";

import { signOut } from "@/lib/auth-client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            // Land on the login page so it's unambiguous you're signed out.
            window.location.href = "/login";
          },
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="destructive" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Logging out..." : "Log Out"}
    </Button>
  );
}
