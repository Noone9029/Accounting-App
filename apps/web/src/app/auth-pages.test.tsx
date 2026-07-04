import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import InviteAcceptPage from "./(auth)/invite/accept/page";
import LoginPage from "./(auth)/login/page";
import PasswordResetConfirmPage from "./(auth)/password-reset/confirm/page";
import PasswordResetRequestPage from "./(auth)/password-reset/page";
import RegisterPage from "./(auth)/register/page";

const apiRequestMock = jest.fn();
const setActiveOrganizationIdMock = jest.fn();

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
  setActiveOrganizationId: (...args: unknown[]) => setActiveOrganizationIdMock(...args),
}));

describe("auth pages", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    setActiveOrganizationIdMock.mockReset();
    localStorage.clear();
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

  it("logs in without storing the returned access token in browser storage", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/auth/login") {
        return Promise.resolve({
          user: { id: "user-1", name: "User", email: "user@example.com" },
          accessToken: "server-token",
        });
      }

      if (path === "/auth/me") {
        return Promise.resolve({
          id: "user-1",
          name: "User",
          email: "user@example.com",
          memberships: [
            {
              id: "membership-1",
              status: "ACTIVE",
              organization: {
                id: "org-1",
                name: "Org",
                legalName: null,
                taxNumber: null,
                countryCode: "AE",
                baseCurrency: "AED",
                timezone: "Asia/Dubai",
              },
              role: { id: "role-1", name: "Admin", permissions: ["*"] },
            },
          ],
        });
      }

      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    const { container } = render(<LoginPage />);
    const passwordInput = container.querySelector<HTMLInputElement>('input[name="password"]');

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    expect(passwordInput).not.toBeNull();
    fireEvent.change(passwordInput as HTMLInputElement, { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/auth/me", { organizationId: null }));

    expect(localStorage.getItem("ledgerbyte.accessToken")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(setActiveOrganizationIdMock).toHaveBeenCalledWith("org-1");
  });
});
