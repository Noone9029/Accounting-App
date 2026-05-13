import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { RoleController } from "./role.controller";

describe("RoleController permissions", () => {
  it("requires roles.view for role reads", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RoleController)).toEqual([PERMISSIONS.roles.view]);
  });

  it("requires roles.manage for role writes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RoleController.prototype.create)).toEqual([PERMISSIONS.roles.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RoleController.prototype.update)).toEqual([PERMISSIONS.roles.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RoleController.prototype.remove)).toEqual([PERMISSIONS.roles.manage]);
  });
});
