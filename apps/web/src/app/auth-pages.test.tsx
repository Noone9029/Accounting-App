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
const mockRouter = { push: jest.fn() };

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
  useRouter: () => mockRouter,
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  setActiveOrganizationId: (...args: unknown[]) => setActiveOrganizationIdMock(...args),
}));

describe("auth pages", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    setActiveOrganizationIdMock.mockReset();
    mockRouter.push.mockReset();
    apiRequestMock.mockImplementation((path: string) => path === "/billing/catalog" ? Promise.resolve({ selfServiceEnabled: true }) : Promise.reject(new Error(`Unexpected path ${path}`)));
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("renders login and gated registration without claiming a paid launch", async () => {
    const { rerender } = render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("LedgerByte account")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Reset it" })).toHaveAttribute("href", "/password-reset");

    rerender(<RegisterPage />);

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    await waitFor(() => expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled());
    expect(apiRequestMock).toHaveBeenCalledWith("/billing/catalog", { auth: false, organizationId: null });
  });

  it.each(["closed", "unavailable"])("keeps signup disabled when catalog is %s while login remains available", async (catalogState) => {
    apiRequestMock.mockImplementation(() => catalogState === "closed" ? Promise.resolve({ selfServiceEnabled: false }) : Promise.reject(new Error("Catalog unavailable")));
    const { rerender } = render(<RegisterPage />);
    expect(await screen.findByText("Self-service enrollment is not open in this environment.")).toBeInTheDocument();
    const create = screen.getByRole("button", { name: "Create account" });
    expect(create).toBeDisabled();
    fireEvent.submit(create.closest("form")!);
    expect(apiRequestMock.mock.calls.every(([path]) => path === "/billing/catalog")).toBe(true);
    rerender(<LoginPage />);
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("routes registration to verification before creating an organization or trial", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/billing/catalog") return Promise.resolve({ selfServiceEnabled: true });
      if (path === "/auth/register") return Promise.resolve({ user: { id: "user-1" } });
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
    const { container } = render(<RegisterPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Synthetic Owner" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.test" } });
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="password"]')!, { target: { value: "Synthetic123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/verify-email"));
    expect(apiRequestMock.mock.calls.map(([path]) => path)).toEqual(["/billing/catalog", "/auth/register"]);
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
          emailVerifiedAt: "2026-09-19T00:00:00.000Z",
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

      if (path === "/billing/status") return Promise.resolve({ subscription: { status: "ACTIVE" }, access: { enforcementMode: "ENFORCE" } });

      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    const { container } = render(<LoginPage />);
    const passwordInput = container.querySelector<HTMLInputElement>('input[name="password"]');

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    expect(passwordInput).not.toBeNull();
    fireEvent.change(passwordInput as HTMLInputElement, { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/dashboard"));

    expect(localStorage.getItem("ledgerbyte.accessToken")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(setActiveOrganizationIdMock).toHaveBeenCalledWith("org-1");
  });

  it.each([
    [false, false, false, "/verify-email"],
    [true, false, false, "/organization/setup"],
    [false, true, true, "/verify-email"],
    [true, true, true, "/plans"],
    [true, true, false, "/dashboard"],
  ] as const)("resumes login (verified=%s, membership=%s, billing=%s) at %s", async (verified, hasMembership, billingPermission, route) => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/auth/login") return Promise.resolve({ user: { id: "owner" } });
      if (path === "/auth/me") return Promise.resolve({
        id: "owner", name: "Owner", email: "owner@example.test", emailVerifiedAt: verified ? "2026-09-19T00:00:00.000Z" : null,
        memberships: hasMembership ? [{ id: "member", status: "ACTIVE", organization: { id: "org-1" }, role: { permissions: billingPermission ? ["billing.view", "billing.manage"] : ["dashboard.view"] } }] : [],
      });
      if (path === "/billing/status") return Promise.resolve({ subscription: null, access: { enforcementMode: "ENFORCE" } });
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.test" } });
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="password"]')!, { target: { value: "Synthetic123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(route));
    if (!billingPermission) expect(apiRequestMock.mock.calls.some(([path]) => path === "/billing/status")).toBe(false);
  });
});
