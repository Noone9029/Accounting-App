import { ALL_PERMISSIONS, PERMISSIONS, type Permission } from "./permissions";

export interface PermissionDefinition {
  permission: Permission;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "organization",
    label: "Organization",
    permissions: [
      permission(PERMISSIONS.dashboard.view, "View dashboard", "See the business overview dashboard and read-only KPI summary."),
      permission(PERMISSIONS.organization.view, "View organization", "See organization profile, branches, and tenant-level context."),
      permission(PERMISSIONS.organization.update, "Update organization", "Edit organization and branch-level administration data."),
    ],
  },
  {
    id: "users",
    label: "Users / Roles",
    permissions: [
      permission(PERMISSIONS.users.view, "View members", "See organization member lists and member details."),
      permission(PERMISSIONS.users.invite, "Invite members", "Create mock/local email invitations for organization members."),
      permission(PERMISSIONS.users.manage, "Manage members", "Change member roles and active/suspended status."),
      permission(PERMISSIONS.roles.view, "View roles", "See roles and permission matrices."),
      permission(PERMISSIONS.roles.manage, "Manage roles", "Create, update, and delete custom roles."),
      permission(PERMISSIONS.auditLogs.view, "View audit logs", "Review high-risk accounting, security, document, bank, inventory, and ZATCA audit events."),
      permission(PERMISSIONS.auditLogs.export, "Export audit logs", "Export filtered audit logs to CSV with sanitized metadata."),
      permission(PERMISSIONS.auditLogs.manageRetention, "Manage audit retention", "Manage audit retention settings and dry-run retention previews."),
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    permissions: [
      permission(PERMISSIONS.accounts.view, "View accounts", "See the chart of accounts."),
      permission(PERMISSIONS.accounts.manage, "Manage accounts", "Create, update, and delete accounts."),
      permission(PERMISSIONS.bankAccounts.view, "View bank accounts", "See cash/bank account profiles and balances."),
      permission(PERMISSIONS.bankAccounts.manage, "Manage bank accounts", "Create, edit, archive, and reactivate bank account profiles."),
      permission(PERMISSIONS.bankAccounts.transactionsView, "View bank transactions", "See posted journal activity for linked cash/bank accounts."),
      permission(PERMISSIONS.bankAccounts.openingBalancePost, "Post bank opening balance", "Post opening balance metadata into a guarded accounting journal."),
      permission(PERMISSIONS.bankTransfers.view, "View bank transfers", "See cash and bank transfers between bank account profiles."),
      permission(PERMISSIONS.bankTransfers.create, "Create bank transfers", "Post bank transfer journals between active bank account profiles."),
      permission(PERMISSIONS.bankTransfers.void, "Void bank transfers", "Void posted bank transfers with one reversal journal."),
      permission(PERMISSIONS.bankStatements.view, "View bank statements", "See imported statement batches, statement rows, and reconciliation summaries."),
      permission(PERMISSIONS.bankStatements.import, "Import bank statements", "Paste local CSV/JSON statement rows for a bank account profile."),
      permission(PERMISSIONS.bankStatements.previewImport, "Preview bank statement imports", "Parse and validate pasted statement rows before saving them."),
      permission(PERMISSIONS.bankStatements.reconcile, "Reconcile bank statements", "Match, categorize, or ignore imported statement rows."),
      permission(PERMISSIONS.bankStatements.manage, "Manage bank statements", "Void statement imports that have not been matched or categorized."),
      permission(PERMISSIONS.bankReconciliations.view, "View bank reconciliations", "See closed and draft bank reconciliation records."),
      permission(PERMISSIONS.bankReconciliations.create, "Create bank reconciliations", "Create draft reconciliation periods for bank account profiles."),
      permission(PERMISSIONS.bankReconciliations.approve, "Approve bank reconciliations", "Approve reconciliations submitted for reviewer sign-off."),
      permission(PERMISSIONS.bankReconciliations.reopen, "Reopen bank reconciliations", "Return submitted or approved reconciliations to draft for correction."),
      permission(PERMISSIONS.bankReconciliations.close, "Close bank reconciliations", "Lock reconciled bank statement periods after review."),
      permission(PERMISSIONS.bankReconciliations.void, "Void bank reconciliations", "Administratively void draft or closed reconciliations."),
      permission(PERMISSIONS.taxRates.view, "View tax rates", "See tax-rate setup."),
      permission(PERMISSIONS.taxRates.manage, "Manage tax rates", "Create and update tax rates."),
      permission(PERMISSIONS.journals.view, "View journals", "See manual journal entries."),
      permission(PERMISSIONS.journals.create, "Create journals", "Create and edit draft manual journals."),
      permission(PERMISSIONS.journals.post, "Post journals", "Post balanced journal entries."),
      permission(PERMISSIONS.journals.reverse, "Reverse journals", "Reverse posted journal entries."),
      permission(PERMISSIONS.fiscalPeriods.view, "View fiscal periods", "See fiscal period status."),
      permission(PERMISSIONS.fiscalPeriods.manage, "Manage fiscal periods", "Create, close, and reopen fiscal periods."),
      permission(PERMISSIONS.fiscalPeriods.lock, "Lock fiscal periods", "Irreversibly lock fiscal periods in the MVP."),
      permission(PERMISSIONS.numberSequences.view, "View number sequences", "See document numbering prefixes, next numbers, padding, and examples."),
      permission(PERMISSIONS.numberSequences.manage, "Manage number sequences", "Update future numbering prefixes, next numbers, and padding with duplicate-prevention checks."),
      permission(PERMISSIONS.contacts.view, "View contacts", "See customer and supplier records."),
      permission(PERMISSIONS.contacts.manage, "Manage contacts", "Create and update contacts."),
      permission(PERMISSIONS.items.view, "View items", "See product and service items."),
      permission(PERMISSIONS.items.manage, "Manage items", "Create, update, disable, and delete items."),
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    permissions: [
      permission(PERMISSIONS.inventory.view, "View inventory", "See inventory balances, operational stock reports, warehouses, and stock ledger pages."),
      permission(PERMISSIONS.inventory.manage, "Manage inventory", "Manage inventory settings such as valuation policy groundwork."),
      permission(PERMISSIONS.inventory.cogsPost, "Post COGS", "Post reviewed sales stock issue COGS into an accounting journal."),
      permission(PERMISSIONS.inventory.cogsReverse, "Reverse COGS", "Reverse a manually posted sales stock issue COGS journal."),
      permission(PERMISSIONS.inventory.receiptsPostAsset, "Post receipt asset", "Post reviewed purchase receipt inventory asset entries for clearing-mode bills."),
      permission(PERMISSIONS.inventory.receiptsReverseAsset, "Reverse receipt asset", "Reverse a manually posted purchase receipt inventory asset journal."),
      permission(PERMISSIONS.inventory.varianceProposalsView, "View variance proposals", "See inventory clearing variance proposal records and events."),
      permission(PERMISSIONS.inventory.varianceProposalsCreate, "Create variance proposals", "Draft variance proposals from clearing report rows or manual accountant review."),
      permission(PERMISSIONS.inventory.varianceProposalsApprove, "Approve variance proposals", "Approve reviewed inventory variance proposals before posting."),
      permission(PERMISSIONS.inventory.varianceProposalsPost, "Post variance proposals", "Create explicit posted journals from approved inventory variance proposals."),
      permission(PERMISSIONS.inventory.varianceProposalsReverse, "Reverse variance proposals", "Reverse posted inventory variance proposal journals."),
      permission(PERMISSIONS.inventory.varianceProposalsVoid, "Void variance proposals", "Void draft, pending, or approved inventory variance proposals."),
      permission(PERMISSIONS.warehouses.view, "View warehouses", "See warehouse master data and warehouse-level stock balances."),
      permission(PERMISSIONS.warehouses.manage, "Manage warehouses", "Create, update, archive, and reactivate warehouses."),
      permission(PERMISSIONS.stockMovements.view, "View stock movements", "See manual operational stock ledger entries."),
      permission(PERMISSIONS.stockMovements.create, "Create stock movements", "Create manual opening balance movements."),
      permission(PERMISSIONS.stockAdjustments.create, "Create stock adjustments", "Legacy permission for manual stock adjustment entry points."),
      permission(PERMISSIONS.inventoryAdjustments.view, "View adjustments", "See inventory adjustment drafts, approvals, and voids."),
      permission(PERMISSIONS.inventoryAdjustments.create, "Create adjustments", "Create and edit draft inventory adjustments."),
      permission(PERMISSIONS.inventoryAdjustments.approve, "Approve adjustments", "Approve draft adjustments and generate operational stock movements."),
      permission(PERMISSIONS.inventoryAdjustments.void, "Void adjustments", "Void draft or approved adjustments and reverse stock when needed."),
      permission(PERMISSIONS.warehouseTransfers.view, "View warehouse transfers", "See posted and voided transfers between warehouses."),
      permission(PERMISSIONS.warehouseTransfers.create, "Create warehouse transfers", "Post operational stock transfers between active warehouses."),
      permission(PERMISSIONS.warehouseTransfers.void, "Void warehouse transfers", "Reverse posted warehouse transfers operationally."),
      permission(PERMISSIONS.purchaseReceiving.view, "View purchase receipts", "See posted and voided operational purchase receipts."),
      permission(PERMISSIONS.purchaseReceiving.create, "Create purchase receipts", "Receive supplier stock into warehouses without accounting journals."),
      permission(PERMISSIONS.salesStockIssue.view, "View sales stock issues", "See posted and voided operational sales stock issues."),
      permission(PERMISSIONS.salesStockIssue.create, "Create sales stock issues", "Issue stock for finalized sales invoices without COGS posting."),
    ],
  },
  {
    id: "sales",
    label: "Sales",
    permissions: [
      permission(PERMISSIONS.salesInvoices.view, "View invoices", "See sales invoices and PDF data."),
      permission(PERMISSIONS.salesInvoices.create, "Create invoices", "Create draft sales invoices."),
      permission(PERMISSIONS.salesInvoices.update, "Update invoices", "Edit or delete draft sales invoices."),
      permission(PERMISSIONS.salesInvoices.finalize, "Finalize invoices", "Finalize invoices and post AR journals."),
      permission(PERMISSIONS.salesInvoices.void, "Void invoices", "Void finalized invoices."),
      permission(PERMISSIONS.customerPayments.view, "View customer payments", "See customer payments and receipts."),
      permission(PERMISSIONS.customerPayments.create, "Create customer payments", "Post and apply customer payments."),
      permission(PERMISSIONS.customerPayments.void, "Void customer payments", "Void payments and reverse unapplied allocations."),
      permission(PERMISSIONS.creditNotes.view, "View credit notes", "See customer credit notes."),
      permission(PERMISSIONS.creditNotes.create, "Create credit notes", "Create draft credit notes and applications."),
      permission(PERMISSIONS.creditNotes.finalize, "Finalize credit notes", "Finalize and apply credit notes."),
      permission(PERMISSIONS.creditNotes.void, "Void credit notes", "Void and reverse credit notes."),
      permission(PERMISSIONS.customerRefunds.view, "View customer refunds", "See customer refunds."),
      permission(PERMISSIONS.customerRefunds.create, "Create customer refunds", "Create manual customer refund records."),
      permission(PERMISSIONS.customerRefunds.void, "Void customer refunds", "Void customer refunds."),
    ],
  },
  {
    id: "purchases",
    label: "Purchases",
    permissions: [
      permission(PERMISSIONS.purchaseOrders.view, "View purchase orders", "See supplier purchase orders and PDFs."),
      permission(PERMISSIONS.purchaseOrders.create, "Create purchase orders", "Create draft non-posting purchase orders."),
      permission(PERMISSIONS.purchaseOrders.update, "Update purchase orders", "Edit, delete, close, or manage draft purchase orders."),
      permission(PERMISSIONS.purchaseOrders.approve, "Approve purchase orders", "Approve purchase orders and mark them as sent."),
      permission(PERMISSIONS.purchaseOrders.void, "Void purchase orders", "Void draft, approved, or sent purchase orders."),
      permission(PERMISSIONS.purchaseOrders.convertToBill, "Convert purchase orders", "Convert approved or sent purchase orders into draft bills."),
      permission(PERMISSIONS.purchaseBills.view, "View bills", "See purchase bills and PDF data."),
      permission(PERMISSIONS.purchaseBills.create, "Create bills", "Create draft purchase bills."),
      permission(PERMISSIONS.purchaseBills.update, "Update bills", "Edit or delete draft purchase bills."),
      permission(PERMISSIONS.purchaseBills.finalize, "Finalize bills", "Finalize bills and post AP journals."),
      permission(PERMISSIONS.purchaseBills.void, "Void bills", "Void finalized purchase bills."),
      permission(PERMISSIONS.supplierPayments.view, "View supplier payments", "See supplier payments and receipts."),
      permission(PERMISSIONS.supplierPayments.create, "Create supplier payments", "Post and apply supplier payments."),
      permission(PERMISSIONS.supplierPayments.void, "Void supplier payments", "Void supplier payments and reverse applications."),
      permission(PERMISSIONS.purchaseDebitNotes.view, "View debit notes", "See purchase debit notes."),
      permission(PERMISSIONS.purchaseDebitNotes.create, "Create debit notes", "Create purchase debit notes and applications."),
      permission(PERMISSIONS.purchaseDebitNotes.finalize, "Finalize debit notes", "Finalize purchase debit notes."),
      permission(PERMISSIONS.purchaseDebitNotes.void, "Void debit notes", "Void purchase debit notes."),
      permission(PERMISSIONS.supplierRefunds.view, "View supplier refunds", "See supplier refunds."),
      permission(PERMISSIONS.supplierRefunds.create, "Create supplier refunds", "Create manual supplier refund records."),
      permission(PERMISSIONS.supplierRefunds.void, "Void supplier refunds", "Void supplier refunds."),
      permission(PERMISSIONS.cashExpenses.view, "View cash expenses", "See cash expenses."),
      permission(PERMISSIONS.cashExpenses.create, "Create cash expenses", "Create posted cash expenses."),
      permission(PERMISSIONS.cashExpenses.void, "Void cash expenses", "Void cash expenses."),
    ],
  },
  {
    id: "reports",
    label: "Reports",
    permissions: [
      permission(PERMISSIONS.reports.view, "View reports", "Open accounting reports."),
      permission(PERMISSIONS.reports.export, "Export reports", "Future report export/PDF permission."),
    ],
  },
  {
    id: "documents",
    label: "Documents",
    permissions: [
      permission(PERMISSIONS.documents.view, "View documents", "See document-related UI."),
      permission(PERMISSIONS.documents.download, "Download documents", "Download document outputs."),
      permission(PERMISSIONS.generatedDocuments.view, "View archive", "See generated document archive records."),
      permission(PERMISSIONS.generatedDocuments.download, "Download archived documents", "Download generated document archive files."),
      permission(PERMISSIONS.attachments.view, "View attachments", "See uploaded supporting-file metadata on linked records."),
      permission(PERMISSIONS.attachments.upload, "Upload attachments", "Upload supporting files to accounting and operational records."),
      permission(PERMISSIONS.attachments.download, "Download attachments", "Download uploaded supporting files."),
      permission(PERMISSIONS.attachments.delete, "Delete attachments", "Soft-delete uploaded supporting files."),
      permission(PERMISSIONS.attachments.manage, "Manage attachments", "Edit uploaded attachment notes and future attachment metadata."),
      permission(PERMISSIONS.emailOutbox.view, "View email outbox", "Review mock/local invite and password reset email delivery records."),
      permission(PERMISSIONS.documentSettings.view, "View document settings", "See document template settings."),
      permission(PERMISSIONS.documentSettings.manage, "Manage document settings", "Save document template settings."),
    ],
  },
  {
    id: "zatca",
    label: "ZATCA",
    permissions: [
      permission(PERMISSIONS.zatca.view, "View ZATCA", "See ZATCA profile, readiness, and local status."),
      permission(PERMISSIONS.zatca.manage, "Manage ZATCA", "Update profile, EGS, CSR, and mock CSID setup."),
      permission(PERMISSIONS.zatca.generateXml, "Generate XML", "Generate local-only ZATCA XML metadata."),
      permission(PERMISSIONS.zatca.runChecks, "Run checks", "Run local/dry-run ZATCA checks."),
    ],
  },
  {
    id: "admin",
    label: "Admin",
    permissions: [permission(PERMISSIONS.admin.fullAccess, "Full access", "Bypasses individual permission checks.")],
  },
];

export function getPermissionLabel(permissionValue: string): string {
  return (
    PERMISSION_GROUPS.flatMap((group) => group.permissions).find((item) => item.permission === permissionValue)?.label ??
    permissionValue
  );
}

const groupedPermissions = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((item) => item.permission)));
export const UNGROUPED_PERMISSIONS = ALL_PERMISSIONS.filter((item) => !groupedPermissions.has(item));

function permission(permissionValue: Permission, label: string, description: string): PermissionDefinition {
  return { permission: permissionValue, label, description };
}
