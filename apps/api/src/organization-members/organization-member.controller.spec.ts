import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { OrganizationMemberController } from "./organization-member.controller";

describe("OrganizationMemberController permissions", () => {
  it("requires users.view for member reads", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OrganizationMemberController.prototype.list)).toEqual([PERMISSIONS.users.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OrganizationMemberController.prototype.get)).toEqual([PERMISSIONS.users.view]);
  });

  it("requires users.manage for member role/status changes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OrganizationMemberController.prototype.updateRole)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OrganizationMemberController.prototype.updateStatus)).toEqual([PERMISSIONS.users.manage]);
  });

  it("requires users.invite for invite placeholders", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OrganizationMemberController.prototype.invite)).toEqual([PERMISSIONS.users.invite]);
  });
});
