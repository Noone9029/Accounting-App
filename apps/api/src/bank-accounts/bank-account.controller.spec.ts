import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { BankAccountController } from "./bank-account.controller";

describe("BankAccountController permissions", () => {
  it("requires bank account view permissions for list/detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.list)).toEqual([
      PERMISSIONS.bankAccounts.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.get)).toEqual([
      PERMISSIONS.bankAccounts.view,
    ]);
  });

  it("requires bank account manage permissions for metadata changes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.create)).toEqual([
      PERMISSIONS.bankAccounts.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.update)).toEqual([
      PERMISSIONS.bankAccounts.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.archive)).toEqual([
      PERMISSIONS.bankAccounts.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.reactivate)).toEqual([
      PERMISSIONS.bankAccounts.manage,
    ]);
  });

  it("requires bank transaction visibility for transaction detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountController.prototype.transactions)).toEqual([
      PERMISSIONS.bankAccounts.transactionsView,
    ]);
  });
});
