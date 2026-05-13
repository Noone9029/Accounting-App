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
});
