import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { StorageController } from "./storage.controller";

describe("StorageController permissions", () => {
  it("requires document settings view or attachment management permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, StorageController.prototype.readiness)).toEqual([
      PERMISSIONS.documentSettings.view,
      PERMISSIONS.attachments.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, StorageController.prototype.migrationPlan)).toEqual([
      PERMISSIONS.documentSettings.view,
      PERMISSIONS.attachments.manage,
    ]);
  });
});
