import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, type Permission } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "./auth/decorators/require-permissions.decorator";
import { AttachmentController } from "./attachments/attachment.controller";
import { AuditLogController } from "./audit-log/audit-log.controller";
import { BankAccountController } from "./bank-accounts/bank-account.controller";
import { BankAccountReconciliationController } from "./bank-reconciliations/bank-account-reconciliation.controller";
import { BankReconciliationController } from "./bank-reconciliations/bank-reconciliation.controller";
import { ComplianceCoreController } from "./compliance-core/compliance-core.controller";
import { CreditNoteController } from "./credit-notes/credit-note.controller";
import { CustomerPaymentController } from "./customer-payments/customer-payment.controller";
import { GeneratedDocumentController } from "./generated-documents/generated-document.controller";
import { PurchaseBillController } from "./purchase-bills/purchase-bill.controller";
import { PurchaseDebitNoteController } from "./purchase-debit-notes/purchase-debit-note.controller";
import { ReportsController } from "./reports/reports.controller";
import { SalesInvoiceController } from "./sales-invoices/sales-invoice.controller";
import { SupplierPaymentController } from "./supplier-payments/supplier-payment.controller";

describe("accounting tenant isolation and RBAC regression", () => {
  const viewerPermissions = new Set<string>(DEFAULT_ROLE_PERMISSIONS.Viewer);

  const mutationPermissions = [
    PERMISSIONS.salesInvoices.create,
    PERMISSIONS.salesInvoices.update,
    PERMISSIONS.salesInvoices.finalize,
    PERMISSIONS.salesInvoices.void,
    PERMISSIONS.customerPayments.create,
    PERMISSIONS.customerPayments.applyUnapplied,
    PERMISSIONS.customerPayments.reverseUnappliedAllocation,
    PERMISSIONS.customerPayments.void,
    PERMISSIONS.creditNotes.create,
    PERMISSIONS.creditNotes.finalize,
    PERMISSIONS.creditNotes.void,
    PERMISSIONS.purchaseBills.create,
    PERMISSIONS.purchaseBills.update,
    PERMISSIONS.purchaseBills.finalize,
    PERMISSIONS.purchaseBills.void,
    PERMISSIONS.supplierPayments.create,
    PERMISSIONS.supplierPayments.void,
    PERMISSIONS.purchaseDebitNotes.create,
    PERMISSIONS.purchaseDebitNotes.finalize,
    PERMISSIONS.purchaseDebitNotes.void,
    PERMISSIONS.bankAccounts.manage,
    PERMISSIONS.bankAccounts.openingBalancePost,
    PERMISSIONS.bankReconciliations.create,
    PERMISSIONS.bankReconciliations.approve,
    PERMISSIONS.bankReconciliations.close,
    PERMISSIONS.bankReconciliations.reopen,
    PERMISSIONS.bankReconciliations.void,
    PERMISSIONS.compliance.manage,
    PERMISSIONS.compliance.validate,
    PERMISSIONS.compliance.archive,
    PERMISSIONS.auditLogs.manageRetention,
    PERMISSIONS.attachments.upload,
    PERMISSIONS.attachments.manage,
    PERMISSIONS.attachments.delete,
  ] as const satisfies readonly Permission[];

  it("keeps the default Viewer role read-only for accounting mutations", () => {
    for (const permission of mutationPermissions) {
      expect(viewerPermissions.has(permission)).toBe(false);
    }
  });

  it.each([
    [SalesInvoiceController, "create", [PERMISSIONS.salesInvoices.create]],
    [SalesInvoiceController, "update", [PERMISSIONS.salesInvoices.update]],
    [SalesInvoiceController, "finalize", [PERMISSIONS.salesInvoices.finalize]],
    [SalesInvoiceController, "void", [PERMISSIONS.salesInvoices.void]],
    [CustomerPaymentController, "create", [PERMISSIONS.customerPayments.create]],
    [CustomerPaymentController, "applyUnapplied", [PERMISSIONS.customerPayments.applyUnapplied]],
    [CustomerPaymentController, "reverseUnappliedAllocation", [PERMISSIONS.customerPayments.reverseUnappliedAllocation]],
    [CustomerPaymentController, "void", [PERMISSIONS.customerPayments.void]],
    [CreditNoteController, "create", [PERMISSIONS.creditNotes.create]],
    [CreditNoteController, "apply", [PERMISSIONS.creditNotes.finalize]],
    [CreditNoteController, "finalize", [PERMISSIONS.creditNotes.finalize]],
    [CreditNoteController, "void", [PERMISSIONS.creditNotes.void]],
    [PurchaseBillController, "create", [PERMISSIONS.purchaseBills.create]],
    [PurchaseBillController, "update", [PERMISSIONS.purchaseBills.update]],
    [PurchaseBillController, "finalize", [PERMISSIONS.purchaseBills.finalize]],
    [PurchaseBillController, "void", [PERMISSIONS.purchaseBills.void]],
    [SupplierPaymentController, "create", [PERMISSIONS.supplierPayments.create]],
    [SupplierPaymentController, "applyUnapplied", [PERMISSIONS.supplierPayments.create]],
    [SupplierPaymentController, "reverseUnappliedAllocation", [PERMISSIONS.supplierPayments.void]],
    [SupplierPaymentController, "void", [PERMISSIONS.supplierPayments.void]],
    [PurchaseDebitNoteController, "create", [PERMISSIONS.purchaseDebitNotes.create]],
    [PurchaseDebitNoteController, "apply", [PERMISSIONS.purchaseDebitNotes.finalize]],
    [PurchaseDebitNoteController, "finalize", [PERMISSIONS.purchaseDebitNotes.finalize]],
    [PurchaseDebitNoteController, "void", [PERMISSIONS.purchaseDebitNotes.void]],
    [BankAccountController, "create", [PERMISSIONS.bankAccounts.manage]],
    [BankAccountController, "update", [PERMISSIONS.bankAccounts.manage]],
    [BankAccountController, "archive", [PERMISSIONS.bankAccounts.manage]],
    [BankAccountController, "postOpeningBalance", [PERMISSIONS.bankAccounts.openingBalancePost]],
    [BankAccountReconciliationController, "create", [PERMISSIONS.bankReconciliations.create]],
    [BankReconciliationController, "submit", [PERMISSIONS.bankReconciliations.close]],
    [BankReconciliationController, "approve", [PERMISSIONS.bankReconciliations.approve]],
    [BankReconciliationController, "close", [PERMISSIONS.bankReconciliations.close]],
    [BankReconciliationController, "reopen", [PERMISSIONS.bankReconciliations.reopen]],
    [BankReconciliationController, "void", [PERMISSIONS.bankReconciliations.void]],
    [ComplianceCoreController, "testAspProviderConfig", [PERMISSIONS.compliance.manage]],
    [ComplianceCoreController, "prepareSalesInvoice", [PERMISSIONS.compliance.manage]],
    [ComplianceCoreController, "prepareCreditNote", [PERMISSIONS.compliance.manage]],
    [ComplianceCoreController, "aspTransmissionPreview", [PERMISSIONS.compliance.validate]],
    [ComplianceCoreController, "submitMockProvider", [PERMISSIONS.compliance.validate]],
    [ComplianceCoreController, "validate", [PERMISSIONS.compliance.validate]],
    [AuditLogController, "updateRetentionSettings", [PERMISSIONS.auditLogs.manageRetention]],
    [AttachmentController, "upload", [PERMISSIONS.attachments.upload]],
    [AttachmentController, "update", [PERMISSIONS.attachments.manage]],
    [AttachmentController, "softDelete", [PERMISSIONS.attachments.delete]],
  ] as Array<[new (...args: never[]) => unknown, string, Permission[]]>)("%p.%s requires %p", (controller, methodName, permissions) => {
    expect(requiredPermissions(controller, methodName)).toEqual(permissions);
  });

  it.each([
    [SalesInvoiceController, "get", [PERMISSIONS.salesInvoices.view]],
    [PurchaseBillController, "get", [PERMISSIONS.purchaseBills.view]],
    [CustomerPaymentController, "get", [PERMISSIONS.customerPayments.view]],
    [SupplierPaymentController, "get", [PERMISSIONS.supplierPayments.view]],
    [CreditNoteController, "get", [PERMISSIONS.creditNotes.view]],
    [PurchaseDebitNoteController, "get", [PERMISSIONS.purchaseDebitNotes.view]],
    [BankAccountController, "get", [PERMISSIONS.bankAccounts.view]],
    [BankReconciliationController, "get", [PERMISSIONS.bankReconciliations.view]],
    [GeneratedDocumentController, "get", [PERMISSIONS.generatedDocuments.view]],
    [AttachmentController, "get", [PERMISSIONS.attachments.view]],
    [ComplianceCoreController, "readiness", [PERMISSIONS.compliance.view]],
    [AuditLogController, "get", [PERMISSIONS.auditLogs.view]],
    [ReportsController, "dashboardSummary", [PERMISSIONS.reports.view]],
  ] as Array<[new (...args: never[]) => unknown, string, Permission[]]>)("%p.%s keeps read access on view permissions", (controller, methodName, permissions) => {
    expect(requiredPermissions(controller, methodName)).toEqual(permissions);
  });
});

function requiredPermissions(controller: new (...args: never[]) => unknown, methodName: string): Permission[] {
  const handler = (controller.prototype as Record<string, object>)[methodName];
  if (!handler) {
    throw new Error(`${controller.name}.${methodName} is not implemented.`);
  }
  return Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) ?? Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller) ?? [];
}
