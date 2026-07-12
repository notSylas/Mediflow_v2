import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogoutButton } from "./LogoutButton";
import { signOut } from "@/lib/auth/auth-client";

vi.mock("@/lib/auth/auth-client", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe("LogoutButton", () => {
  it("calls signOut when clicked", async () => {
    render(<LogoutButton />);

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
