import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders just the brand link when there is no user", () => {
    render(<AppHeader user={null} />);

    expect(screen.getByRole("link", { name: "MediFlow" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("renders the user's email, role badge, and logout button when signed in", () => {
    render(
      <AppHeader
        user={{
          id: "1",
          email: "doc@example.com",
          name: "Doc",
          role: "doctor",
        } as never}
      />
    );

    expect(screen.getByText("doc@example.com")).toBeInTheDocument();
    expect(screen.getByText("doctor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });
});
