import { PERMISSIONS } from "@ledgerbyte/shared";
import { PATH_METADATA, GUARDS_METADATA } from "@nestjs/common/constants";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CostCenterController } from "./cost-center.controller";

describe("CostCenterController", () => {
  it("uses the cost-centers route and required authentication, tenant, and permission guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, CostCenterController)).toBe("cost-centers");
    expect(Reflect.getMetadata(GUARDS_METADATA, CostCenterController)).toEqual([JwtAuthGuard, OrganizationContextGuard, PermissionGuard]);
  });

  it("requires accounts.view for list and detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CostCenterController.prototype.list)).toEqual([PERMISSIONS.accounts.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CostCenterController.prototype.get)).toEqual([PERMISSIONS.accounts.view]);
  });

  it("requires accounts.manage for create and update", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CostCenterController.prototype.create)).toEqual([PERMISSIONS.accounts.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CostCenterController.prototype.update)).toEqual([PERMISSIONS.accounts.manage]);
  });
});
