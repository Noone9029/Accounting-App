import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { BankAccountStatementController } from "./bank-account-statement.controller";
import { BankStatementImportController } from "./bank-statement-import.controller";
import { BankStatementTransactionController } from "./bank-statement-transaction.controller";

describe("Bank statement controller permissions", () => {
  it("requires statement view permission for imports, transactions, detail, and summary", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountStatementController.prototype.listImports)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountStatementController.prototype.listTransactions)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountStatementController.prototype.reconciliationSummary)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementImportController.prototype.get)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementTransactionController.prototype.get)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
  });

  it("requires import, reconcile, and manage permissions for write actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountStatementController.prototype.importStatement)).toEqual([
      PERMISSIONS.bankStatements.import,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankAccountStatementController.prototype.previewImport)).toEqual([
      PERMISSIONS.bankStatements.previewImport,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementTransactionController.prototype.matchCandidates)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementTransactionController.prototype.match)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementTransactionController.prototype.categorize)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementTransactionController.prototype.ignore)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankStatementImportController.prototype.void)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
  });
});
