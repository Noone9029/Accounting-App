import { ForbiddenException, StreamableFile } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { BankAccountReconciliationController } from "./bank-account-reconciliation.controller";
import { BankReconciliationController } from "./bank-reconciliation.controller";

describe("Bank reconciliation controller permissions", () => {
  it("requires reconciliation view permission for lists, details, and items", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountReconciliationController.prototype.list)).toEqual([
      PERMISSIONS.bankReconciliations.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.get)).toEqual([
      PERMISSIONS.bankReconciliations.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.items)).toEqual([
      PERMISSIONS.bankReconciliations.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.reportData)).toEqual([
      PERMISSIONS.bankReconciliations.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.reportCsv)).toEqual([
      PERMISSIONS.bankReconciliations.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.reportPdf)).toEqual([
      PERMISSIONS.bankReconciliations.view,
    ]);
  });

  it("requires create, close, and void permissions for write actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountReconciliationController.prototype.create)).toEqual([
      PERMISSIONS.bankReconciliations.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.close)).toEqual([
      PERMISSIONS.bankReconciliations.close,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankReconciliationController.prototype.void)).toEqual([
      PERMISSIONS.bankReconciliations.void,
    ]);
  });

  it("requires export permission for reconciliation report downloads", async () => {
    const controller = new BankReconciliationController({
      reportCsvFile: jest.fn().mockResolvedValue({ filename: "reconciliation-REC-000001.csv", content: "Bank Reconciliation Report\r\n" }),
    } as never);
    const response = { set: jest.fn() };
    const request = { membership: { role: { permissions: [PERMISSIONS.bankReconciliations.view] } } };

    await expect(controller.reportCsv("org-1", "rec-1", request as never, response as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns text/csv for reconciliation report CSV downloads", async () => {
    const controller = new BankReconciliationController({
      reportCsvFile: jest.fn().mockResolvedValue({ filename: "reconciliation-REC-000001.csv", content: "Bank Reconciliation Report\r\n" }),
    } as never);
    const response = { set: jest.fn() };
    const request = { membership: { role: { permissions: [PERMISSIONS.reports.export] } } };

    const result = await controller.reportCsv("org-1", "rec-1", request as never, response as never);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(response.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "text/csv; charset=utf-8" }));
  });
});
