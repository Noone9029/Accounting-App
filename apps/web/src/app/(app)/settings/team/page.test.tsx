import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import TeamSettingsPage, { BetaAccessGuidance } from "./page";

const apiRequestMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
    reload: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("team settings beta guidance", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/organization-members") {
        return Promise.resolve([
          {
            id: "member-1",
            organizationId: "org-1",
            userId: "user-1",
            roleId: "role-viewer",
            status: "ACTIVE",
            createdAt: "2026-05-22T00:00:00.000Z",
            updatedAt: "2026-05-22T00:00:00.000Z",
            user: { id: "user-1", email: "tester@example.test", name: "Beta User", createdAt: "2026-05-22T00:00:00.000Z" },
            role: { id: "role-viewer", name: "Viewer", permissions: [], isSystem: true },
          },
        ]);
      }
      if (path === "/roles") {
        return Promise.resolve([
          {
            id: "role-viewer",
            organizationId: "org-1",
            name: "Viewer",
            permissions: [],
            isSystem: true,
            memberCount: 1,
            createdAt: "2026-05-22T00:00:00.000Z",
            updatedAt: "2026-05-22T00:00:00.000Z",
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("renders safe beta access guidance", () => {
    render(<BetaAccessGuidance />);

    expect(screen.getByText("Beta access guidance")).toBeInTheDocument();
    expect(screen.getByText(/Start with 3-5 selected testers/)).toBeInTheDocument();
    expect(screen.getByText(/Use dummy customers, suppliers, bank files, and documents only/)).toBeInTheDocument();
    expect(screen.getByText(/Keep Owner\/Admin access internal/)).toBeInTheDocument();
    expect(screen.getByText(/does not enable production ZATCA submission/)).toBeInTheDocument();
    expect(screen.getByText(/live bank feeds/)).toBeInTheDocument();
  });

  it("keeps the members table horizontally scrollable and explains revocation", async () => {
    render(<TeamSettingsPage />);

    await screen.findByText("Beta User");
    expect(screen.getByText(/Suspend after the beta session to revoke access/)).toBeInTheDocument();
    expect(screen.getByText(/use password reset rather than sharing credentials/)).toBeInTheDocument();

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/organization-members"));
    expect(screen.getByLabelText("Team members table")).toHaveClass("overflow-x-auto");
  });
});
