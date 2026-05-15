import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { AuditLogController } from "./audit-log.controller";

describe("AuditLogController permissions", () => {
  it("requires audit log view permission for list, detail, and retention settings read", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.list)).toEqual([
      PERMISSIONS.auditLogs.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.get)).toEqual([
      PERMISSIONS.auditLogs.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.getRetentionSettings)).toEqual([
      PERMISSIONS.auditLogs.view,
    ]);
  });

  it("requires dedicated export and retention management permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.exportCsv)).toEqual([
      PERMISSIONS.auditLogs.export,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.updateRetentionSettings)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.retentionPreview)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AuditLogController.prototype.retentionDryRun)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
  });
});
