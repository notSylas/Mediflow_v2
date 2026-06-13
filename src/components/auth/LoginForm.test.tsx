import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { authClient } from "@/lib/auth-client";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams("redirectTo=/patient"),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: vi.fn() },
    signIn: { email: vi.fn(), emailOtp: vi.fn(), social: vi.fn() },
  },
}));

async function usePassword() {
  await userEvent.click(screen.getByRole("button", { name: "Password" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in with email and password", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ error: null } as never);

    render(<LoginForm googleEnabled={false} />);

    await usePassword();
    await userEvent.type(screen.getByLabelText("Email"), "patient@example.com");
    await userEvent.type(screen.getByPlaceholderText("Your password"), "supersecret");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(authClient.signIn.email).toHaveBeenCalledWith({
      email: "patient@example.com",
      password: "supersecret",
    });
    expect(push).toHaveBeenCalledWith("/patient");
  });

  it("sends an OTP and advances to the code step", async () => {
    vi.mocked(authClient.emailOtp.sendVerificationOtp).mockResolvedValue({
      error: null,
    } as never);

    render(<LoginForm googleEnabled={false} />);

    await userEvent.type(screen.getByLabelText("Email"), "patient@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(authClient.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
      email: "patient@example.com",
      type: "sign-in",
    });
    expect(await screen.findByLabelText("Verification code")).toBeInTheDocument();
  });

  it("shows an error if sending the OTP fails", async () => {
    vi.mocked(authClient.emailOtp.sendVerificationOtp).mockResolvedValue({
      error: { message: "Too many requests" },
    } as never);

    render(<LoginForm googleEnabled={false} />);

    await userEvent.type(screen.getByLabelText("Email"), "patient@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByText("Too many requests")).toBeInTheDocument();
    expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
  });

  it("verifies the OTP and redirects to redirectTo", async () => {
    vi.mocked(authClient.emailOtp.sendVerificationOtp).mockResolvedValue({
      error: null,
    } as never);
    vi.mocked(authClient.signIn.emailOtp).mockResolvedValue({
      error: null,
    } as never);

    render(<LoginForm googleEnabled={false} />);

    await userEvent.type(screen.getByLabelText("Email"), "patient@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    await userEvent.type(await screen.findByLabelText("Verification code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify & sign in/i }));

    expect(authClient.signIn.emailOtp).toHaveBeenCalledWith({
      email: "patient@example.com",
      otp: "123456",
    });
    expect(push).toHaveBeenCalledWith("/patient");
    expect(refresh).toHaveBeenCalled();
  });

  it("returns to the email step via 'Use a different email'", async () => {
    vi.mocked(authClient.emailOtp.sendVerificationOtp).mockResolvedValue({
      error: null,
    } as never);

    render(<LoginForm googleEnabled={false} />);

    await userEvent.type(screen.getByLabelText("Email"), "patient@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    await screen.findByLabelText("Verification code");
    await userEvent.click(screen.getByRole("button", { name: /use a different email/i }));

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
  });

  it("hides the Google button when googleEnabled is false", () => {
    render(<LoginForm googleEnabled={false} />);

    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it("signs in with Google when the button is clicked", async () => {
    vi.mocked(authClient.signIn.social).mockResolvedValue({ error: null } as never);

    render(<LoginForm googleEnabled={true} />);

    await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/patient",
    });
  });

  it("shows a retryable error when sending the OTP throws", async () => {
    vi.mocked(authClient.emailOtp.sendVerificationOtp).mockRejectedValue(
      new Error("Network failure")
    );

    render(<LoginForm googleEnabled={false} />);

    await userEvent.type(screen.getByLabelText("Email"), "patient@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(
      await screen.findByText("Couldn't reach the server. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send code/i })).toBeEnabled();
  });
});
