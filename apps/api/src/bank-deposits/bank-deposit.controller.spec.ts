import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { BankDepositController } from "./bank-deposit.controller";

describe("BankDepositController permissions", () => {
  it("requires statement view permissions for read-only deposit routes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.list)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.get)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.sourceCandidates)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
  });

  it("requires statement manage permissions for draft maintenance", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.create)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.update)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.addLine)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.removeLine)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
  });

  it("requires reconcile permissions for post, void, match, and unmatch actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.post)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.void)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.matchCandidates)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.match)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankDepositController.prototype.unmatch)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
  });
});
