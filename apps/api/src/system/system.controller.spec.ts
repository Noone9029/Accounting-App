import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { SystemController } from "./system.controller";

describe("SystemController permissions", () => {
  it("requires audit retention administration for backup readiness endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.configReadiness)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.backupReadiness)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.restoreDrillPlan)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.listBackupEvidence)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.createBackupEvidence)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.verifyBackupEvidence)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.revokeBackupEvidence)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
  });
});
