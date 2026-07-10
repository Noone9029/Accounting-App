import { PERMISSIONS } from "@ledgerbyte/shared";
import { GUARDS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ProjectController } from "./project.controller";

describe("ProjectController", () => {
  it("uses the projects route and required authentication, tenant, and permission guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProjectController)).toBe("projects");
    expect(Reflect.getMetadata(GUARDS_METADATA, ProjectController)).toEqual([JwtAuthGuard, OrganizationContextGuard, PermissionGuard]);
  });

  it("requires accounts.view for list and detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ProjectController.prototype.list)).toEqual([PERMISSIONS.accounts.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ProjectController.prototype.get)).toEqual([PERMISSIONS.accounts.view]);
  });

  it("requires accounts.manage for create and update", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ProjectController.prototype.create)).toEqual([PERMISSIONS.accounts.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ProjectController.prototype.update)).toEqual([PERMISSIONS.accounts.manage]);
  });
});
