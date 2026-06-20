import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AutomationProposalBoundaryController } from "./automation-proposal-boundary.controller";

describe("AutomationProposalBoundaryController", () => {
  it("requires dashboard view permission for the read-only boundary endpoint", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AutomationProposalBoundaryController.prototype.boundary)).toEqual([
      PERMISSIONS.dashboard.view,
    ]);
  });

  it("uses auth, organization context, and permission guards", () => {
    expect(Reflect.getMetadata("__guards__", AutomationProposalBoundaryController)).toEqual([
      JwtAuthGuard,
      OrganizationContextGuard,
      PermissionGuard,
    ]);
  });

  it("delegates to the service with the current organization id", () => {
    const service = { boundary: jest.fn().mockReturnValue({ mode: "PROPOSAL_ONLY" }) };
    const controller = new AutomationProposalBoundaryController(service as never);

    expect(controller.boundary("org-1")).toEqual({ mode: "PROPOSAL_ONLY" });
    expect(service.boundary).toHaveBeenCalledWith("org-1");
  });
});
