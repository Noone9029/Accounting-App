import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SecuritySettingsPage from "./page";

function mockIdentityProfile() {
  return {
    can: () => true,
    reload: jest.fn(),
    user: {
      id: "user-1",
      email: "owner@example.test",
      name: "Owner LedgerByte",
      memberships: [],
    },
    activeMembership: {
      organization: {
        id: "org-1",
        name: "Visual Studio Limited",
        legalName: "Visual Studio Holdings",
      },
      role: {
        id: "role-owner",
        name: "Owner",
        permissions: [],
      },
      status: "ACTIVE",
    },
    loading: false,
    error: "",
  };
}

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => mockIdentityProfile(),
}));

describe("settings security page", () => {
  it("renders read-only security overview and link shortcuts", () => {
    render(<SecuritySettingsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Security settings" })).toBeInTheDocument();
    expect(screen.getByText("JWT bearer authentication is enabled.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team settings" })).toHaveAttribute("href", "/settings/team");
    expect(screen.getByRole("link", { name: "Roles and permissions" })).toHaveAttribute("href", "/settings/roles");
    expect(screen.getByRole("link", { name: "Audit log shortcut" })).toHaveAttribute("href", "/settings/audit-logs");
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByRole("link", { name: "Organization setup" })).toHaveAttribute("href", "/organization/setup");
  });

  it("explicitly lists missing security capabilities as not available yet", () => {
    render(<SecuritySettingsPage />);

    expect(screen.getByRole("heading", { name: "Not available yet" })).toBeInTheDocument();
    expect(screen.getByText(/Active session list/)).toBeInTheDocument();
    expect(screen.getByText(/Session revoke \/ logout all devices/)).toBeInTheDocument();
    expect(screen.getByText(/API tokens/)).toBeInTheDocument();
    expect(screen.getByText(/Logged-in password change/)).toBeInTheDocument();
    expect(screen.getAllByText(/Not available yet/).length).toBeGreaterThan(0);
  });

  it("does not present unsupported controls as enabled", () => {
    render(<SecuritySettingsPage />);

    expect(screen.queryByText("Change password", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/MFA enabled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MFA enforced/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SSO enabled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/API tokens enabled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/password change enabled/i)).not.toBeInTheDocument();
  });
});
