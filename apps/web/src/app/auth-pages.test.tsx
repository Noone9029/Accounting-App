import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import InviteAcceptPage from "./(auth)/invite/accept/page";
import LoginPage from "./(auth)/login/page";
import PasswordResetConfirmPage from "./(auth)/password-reset/confirm/page";
import PasswordResetRequestPage from "./(auth)/password-reset/page";
import RegisterPage from "./(auth)/register/page";

const apiRequestMock = jest.fn();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  setAccessToken: jest.fn(),
  setActiveOrganizationId: jest.fn(),
}));

describe("auth pages", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    window.history.replaceState(null, "", "/");
  });

  it("renders login and register pages with beta access framing", () => {
    const { rerender } = render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Private beta access")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Reset it" })).toHaveAttribute("href", "/password-reset");

    rerender(<RegisterPage />);

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("renders password reset request and confirmation without real email claims", () => {
    const { rerender } = render(<PasswordResetRequestPage />);

    expect(screen.getByRole("heading", { name: "Reset password" })).toBeInTheDocument();
    expect(screen.getByText("Real email delivery is not configured yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset instructions" })).toBeEnabled();

    rerender(<PasswordResetConfirmPage />);

    expect(screen.getByRole("heading", { name: "Set new password" })).toBeInTheDocument();
    expect(screen.getByText("Password reset token is missing.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeDisabled();
  });

  it("renders invite acceptance as guarded when the token is missing", () => {
    render(<InviteAcceptPage />);

    expect(screen.getByRole("heading", { name: "Accept invitation" })).toBeInTheDocument();
    expect(screen.getByText("Invitation token is missing.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
