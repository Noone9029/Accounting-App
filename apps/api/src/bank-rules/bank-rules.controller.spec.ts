import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { BankRuleStatementTransactionController, BankRulesController } from "./bank-rules.controller";

describe("bank rules controller permissions", () => {
  it("requires view permission for rule listing, dry-run, and row suggestions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRulesController.prototype.list)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRulesController.prototype.dryRun)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRuleStatementTransactionController.prototype.suggestions)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
  });

  it("requires manage or reconcile permissions for rule writes and explicit apply", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRulesController.prototype.create)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRulesController.prototype.update)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRulesController.prototype.disable)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankRuleStatementTransactionController.prototype.apply)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
  });
});
