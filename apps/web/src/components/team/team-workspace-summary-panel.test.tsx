import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { TeamWorkspaceSummaryPanel } from "./team-workspace-summary-panel";
import type { TeamWorkspaceSummary } from "@/lib/types";

describe("TeamWorkspaceSummaryPanel", () => {
  it("renders read-only team posture without exposing member email or mutation actions", () => {
    render(<TeamWorkspaceSummaryPanel summary={summaryFixture()} />);

    expect(screen.getByText("Team workspace summary")).toBeInTheDocument();
    expect(screen.getByText("Read-only review")).toBeInTheDocument();
    expect(screen.getByText("No invite or email")).toBeInTheDocument();
    expect(screen.getByText("No role or ownership change")).toBeInTheDocument();
    expect(screen.getByText("Total members")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Invited").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Suspended").length).toBeGreaterThan(0);
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
    expect(screen.getByText("Full access")).toBeInTheDocument();
    expect(screen.getByText("User manager")).toBeInTheDocument();
    expect(screen.getByText(/last full-access removal blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/last user-manager removal blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/No invite, join request, or email/i)).toBeInTheDocument();
    expect(screen.getByText(/No role, membership status, ownership transfer/i)).toBeInTheDocument();

    expect(document.body).not.toHaveTextContent("owner@example.com");
    expect(document.body).not.toHaveTextContent("viewer@example.com");
    expect(document.body).not.toHaveTextContent(/send invite/i);
    expect(document.body).not.toHaveTextContent(/invite sent/i);
    expect(document.body).not.toHaveTextContent(/transfer ownership/i);
    expect(document.body).not.toHaveTextContent(/production ready/i);
    expect(screen.queryByRole("button", { name: /invite|send|role|suspend|reactivate|transfer|switch/i })).not.toBeInTheDocument();
  });

  it("renders an empty role distribution as review-only guidance", () => {
    render(<TeamWorkspaceSummaryPanel summary={{ ...summaryFixture(), roleDistribution: [] }} />);

    expect(screen.getByText("No role distribution available")).toBeInTheDocument();
    expect(screen.getByText("Review can continue after members and roles load.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/provider configured/i);
  });
});

function summaryFixture(): TeamWorkspaceSummary {
  return {
    generatedAt: "2026-06-21T08:00:00.000Z",
    totalMemberCount: 3,
    activeMemberCount: 1,
    invitedMemberCount: 1,
    suspendedMemberCount: 1,
    statusCounts: {
      ACTIVE: 1,
      INVITED: 1,
      SUSPENDED: 1,
    },
    roleDistribution: [
      {
        roleId: "role-owner",
        roleName: "Owner",
        isSystem: true,
        totalMemberCount: 1,
        activeMemberCount: 1,
        invitedMemberCount: 0,
        suspendedMemberCount: 0,
        permissionCount: 1,
        hasFullAccess: true,
        canManageUsers: true,
        unsafeMemberEmail: "owner@example.com",
      } as TeamWorkspaceSummary["roleDistribution"][number],
      {
        roleId: "role-viewer",
        roleName: "Viewer",
        isSystem: true,
        totalMemberCount: 1,
        activeMemberCount: 0,
        invitedMemberCount: 1,
        suspendedMemberCount: 0,
        permissionCount: 1,
        hasFullAccess: false,
        canManageUsers: false,
        unsafeMemberEmail: "viewer@example.com",
      } as TeamWorkspaceSummary["roleDistribution"][number],
    ],
    safeguards: {
      hasActiveFullAccessMember: true,
      hasActiveUserManager: true,
      lastFullAccessRemovalBlocked: true,
      lastUserManagerRemovalBlocked: true,
    },
    reviewNotice:
      "Team workspace summary is read-only. It reviews current organization memberships and roles without inviting users, changing roles, changing statuses, transferring ownership, switching organizations, or sending email.",
    blockedActions: [
      "No invite, join request, or email is created from this endpoint.",
      "No role, membership status, ownership transfer, or organization switch is performed.",
      "No provider, storage, VAT, ZATCA, UAE, Peppol, or production-readiness action or claim is made.",
    ],
  };
}
