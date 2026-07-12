import { PERMISSIONS, type Permission } from "./permissions";

export type AppRouteSection =
  | "overview"
  | "setup"
  | "contacts"
  | "sales"
  | "purchases"
  | "banking"
  | "accounting"
  | "inventory"
  | "documents"
  | "compliance"
  | "reports"
  | "settings"
  | "future";

export type AppRouteCapabilityStatus = "active" | "planned" | "inactive";
export type AppRouteSensitivity = "compliance" | "storage" | "provider";

export interface AppRouteDefinition {
  key: string;
  label: string;
  href: string;
  section: AppRouteSection;
  description: string;
  capabilityStatus: AppRouteCapabilityStatus;
  shellVisible: boolean;
  mobileVisible?: boolean;
  mobileLabel?: string;
  requiredAny: readonly Permission[];
  activePrefix?: string;
  sidebarGroup?: string;
  sensitivity?: readonly AppRouteSensitivity[];
}

export const APP_ROUTES = [
  route("dashboard", "Dashboard", "/dashboard", "overview", "Workspace dashboard and current accounting attention items.", [PERMISSIONS.dashboard.view], {
    shellVisible: true,
    mobileVisible: true,
  }),
  route("setup", "Setup", "/setup", "setup", "Guided setup checklist for first workspace configuration.", [PERMISSIONS.dashboard.view], {
    mobileVisible: true,
  }),
  route("customers", "Customers", "/customers", "contacts", "Customer records and receivable workspace entry point.", [PERMISSIONS.contacts.view], {
    shellVisible: true,
    mobileVisible: true,
    mobileLabel: "Customer",
  }),
  route("suppliers", "Suppliers", "/suppliers", "contacts", "Supplier records and payable workspace entry point.", [PERMISSIONS.contacts.view], {
    shellVisible: true,
    mobileVisible: true,
    mobileLabel: "Supplier",
  }),
  route("contacts", "Contacts", "/contacts", "contacts", "Shared contact directory for accounting relationships.", [PERMISSIONS.contacts.view]),

  route("sales.invoice.list", "Invoices", "/sales/invoices", "sales", "Sales invoice list and receivables workflow.", [PERMISSIONS.salesInvoices.view], {
    shellVisible: true,
    activePrefix: "/sales",
  }),
  route("sales.invoice.new", "Create invoice", "/sales/invoices/new", "sales", "Create a sales invoice from the mobile workflow.", [PERMISSIONS.salesInvoices.create], {
    mobileVisible: true,
    mobileLabel: "Invoice",
  }),
  route("sales.creditNote.list", "Credit notes", "/sales/credit-notes", "sales", "Sales credit note list and credit memo workflow.", [PERMISSIONS.creditNotes.view]),
  route("sales.customerPayment.list", "Customer payments", "/sales/customer-payments", "sales", "Customer payment receipts and allocation workspace.", [
    PERMISSIONS.customerPayments.view,
  ]),
  route(
    "sales.customerPayment.new",
    "Create customer payment",
    "/sales/customer-payments/new",
    "sales",
    "Create a customer payment from the mobile workflow.",
    [PERMISSIONS.customerPayments.create],
    { mobileVisible: true, mobileLabel: "Payment" },
  ),
  route("sales.quote.list", "Quotes", "/sales/quotes", "sales", "Sales quote and proforma list.", [PERMISSIONS.salesInvoices.view], {
    sidebarGroup: "Supporting workflows",
  }),
  route(
    "sales.recurringInvoice.list",
    "Recurring invoices",
    "/sales/recurring-invoices",
    "sales",
    "Recurring invoice template list.",
    [PERMISSIONS.salesInvoices.view],
    { sidebarGroup: "Supporting workflows" },
  ),
  route(
    "accounting.recurringTransactions",
    "Recurring transactions",
    "/recurring-transactions",
    "accounting",
    "Unified recurring invoices, bills, expense proposals, and journals.",
    [PERMISSIONS.recurringTransactions.read],
    { shellVisible: true, sidebarGroup: "Automation" },
  ),
  route("sales.deliveryNote.list", "Delivery notes", "/sales/delivery-notes", "sales", "Sales fulfillment delivery note list.", [PERMISSIONS.salesInvoices.view], {
    sidebarGroup: "Supporting workflows",
  }),
  route("sales.collection.list", "Collections", "/sales/collections", "sales", "Receivables collection follow-up workspace.", [PERMISSIONS.salesInvoices.view], {
    sidebarGroup: "Supporting workflows",
  }),
  route(
    "sales.inventoryReturn.list",
    "Inventory returns",
    "/sales/inventory-returns",
    "sales",
    "Operational sales inventory return list.",
    [PERMISSIONS.salesInvoices.view],
    { sidebarGroup: "Supporting workflows" },
  ),
  route("sales.customerRefund.list", "Customer refunds", "/sales/customer-refunds", "sales", "Customer refund list and review workspace.", [
    PERMISSIONS.customerRefunds.view,
  ]),

  route("purchase.bill.list", "Bills", "/purchases/bills", "purchases", "Purchase bill list and payables workflow.", [PERMISSIONS.purchaseBills.view], {
    shellVisible: true,
    activePrefix: "/purchases",
  }),
  route("purchase.debitNote.list", "Debit notes", "/purchases/debit-notes", "purchases", "Purchase debit note list.", [
    PERMISSIONS.purchaseDebitNotes.view,
  ]),
  route("purchase.supplierPayment.list", "Supplier payments", "/purchases/supplier-payments", "purchases", "Supplier payment list and allocation workspace.", [
    PERMISSIONS.supplierPayments.view,
  ]),
  route(
    "purchase.supplierPayoutRequest.list",
    "Payout requests",
    "/purchases/supplier-payout-requests",
    "purchases",
    "Wio-shaped supplier payout request review, approval status, blocked release, and reconciliation workspace.",
    [PERMISSIONS.bankIntegrations.vendorPaymentCreate, PERMISSIONS.bankIntegrations.vendorPaymentApprove, PERMISSIONS.bankIntegrations.vendorPaymentReconcile],
    { sidebarGroup: "Review and operations", sensitivity: ["provider"] },
  ),
  route(
    "purchase.apDashboard",
    "AP dashboard",
    "/purchases/ap-dashboard",
    "purchases",
    "Supplier and accounts payable review dashboard.",
    [
      PERMISSIONS.contacts.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.inventory.view,
      PERMISSIONS.supplierPayments.view,
      PERMISSIONS.purchaseDebitNotes.view,
      PERMISSIONS.supplierRefunds.view,
    ],
    { sidebarGroup: "Review and operations" },
  ),
  route("purchase.order.list", "Purchase orders", "/purchases/purchase-orders", "purchases", "Purchase order list and conversion workflow.", [
    PERMISSIONS.purchaseOrders.view,
  ], {
    sidebarGroup: "Review and operations",
  }),
  route("purchase.return.list", "Purchase returns", "/purchases/returns", "purchases", "Operational purchase return review workspace.", [
    PERMISSIONS.purchaseOrders.view,
    PERMISSIONS.purchaseBills.view,
    PERMISSIONS.purchaseReceiving.view,
  ], {
    sidebarGroup: "Review and operations",
  }),
  route("purchase.matching", "Matching exceptions", "/purchases/matching", "purchases", "Purchase order, receipt, and bill matching review.", [
    PERMISSIONS.purchaseOrders.view,
    PERMISSIONS.purchaseBills.view,
    PERMISSIONS.purchaseReceiving.view,
  ], {
    sidebarGroup: "Review and operations",
  }),
  route("purchase.supplierRefund.list", "Supplier refunds", "/purchases/supplier-refunds", "purchases", "Supplier refund list and review workspace.", [
    PERMISSIONS.supplierRefunds.view,
  ]),
  route("purchase.cashExpense.list", "Cash expenses", "/purchases/cash-expenses", "purchases", "Cash expense list and spend capture workflow.", [
    PERMISSIONS.cashExpenses.view,
  ]),

  route("banking.bankAccounts", "Bank accounts", "/bank-accounts", "banking", "Bank account list and reconciliation entry point.", [PERMISSIONS.bankAccounts.view], {
    shellVisible: true,
    activePrefix: "/bank-accounts",
  }),
  route("banking.bankTransfers", "Bank transfers", "/bank-transfers", "banking", "Bank transfer list and movement workflow.", [PERMISSIONS.bankTransfers.view]),

  route("accounting.journals", "Manual journals", "/journal-entries", "accounting", "Manual journal entry list.", [PERMISSIONS.journals.view], {
    shellVisible: true,
    activePrefix: "/journal-entries",
  }),
  route("accounting.accounts", "Chart of accounts", "/accounts", "accounting", "Chart of accounts list and account setup.", [PERMISSIONS.accounts.view]),
  route("accounting.fiscalPeriods", "Fiscal periods", "/fiscal-periods", "accounting", "Fiscal period administration workspace.", [
    PERMISSIONS.fiscalPeriods.view,
  ]),
  route(
    "accounting.fxRevaluations",
    "FX revaluation",
    "/fx-revaluations",
    "accounting",
    "Preview, review, post, and reverse period-end foreign monetary balance revaluations.",
    [PERMISSIONS.fxRevaluation.read],
  ),
  route("accounting.fxClose", "FX close readiness", "/fx-close", "accounting", "Review FX blockers before fiscal period close or lock.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Accounting",
  }),

  route("inventory.items", "Products & services", "/items", "inventory", "Products and services item catalog.", [PERMISSIONS.items.view]),
  route("inventory.warehouses", "Warehouses", "/inventory/warehouses", "inventory", "Warehouse list and stock location setup.", [PERMISSIONS.warehouses.view]),
  route("inventory.stockMovements", "Stock movements", "/inventory/stock-movements", "inventory", "Inventory stock movement list.", [
    PERMISSIONS.stockMovements.view,
  ]),
  route("inventory.adjustments", "Adjustments", "/inventory/adjustments", "inventory", "Inventory adjustment list and review workspace.", [
    PERMISSIONS.inventoryAdjustments.view,
  ]),
  route("inventory.transfers", "Transfers", "/inventory/transfers", "inventory", "Warehouse transfer list and movement workflow.", [
    PERMISSIONS.warehouseTransfers.view,
  ]),
  route("inventory.purchaseReceipts", "Purchase receipts", "/inventory/purchase-receipts", "inventory", "Purchase receipt list and inventory receiving workflow.", [
    PERMISSIONS.purchaseReceiving.view,
  ]),
  route("inventory.salesStockIssues", "Sales stock issues", "/inventory/sales-stock-issues", "inventory", "Sales stock issue list and review workspace.", [
    PERMISSIONS.salesStockIssue.view,
  ]),
  route("inventory.balances", "Inventory balances", "/inventory/balances", "inventory", "Current inventory balances by item and location.", [PERMISSIONS.inventory.view], {
    shellVisible: true,
    activePrefix: "/inventory",
  }),
  route("inventory.report.stockValuation", "Stock valuation", "/inventory/reports/stock-valuation", "inventory", "Inventory stock valuation report.", [
    PERMISSIONS.inventory.view,
  ]),
  route("inventory.report.movementSummary", "Movement summary", "/inventory/reports/movement-summary", "inventory", "Inventory movement summary report.", [
    PERMISSIONS.inventory.view,
  ]),
  route("inventory.report.lowStock", "Low stock", "/inventory/reports/low-stock", "inventory", "Low stock review report.", [PERMISSIONS.inventory.view]),
  route(
    "inventory.report.clearingReconciliation",
    "Clearing reconciliation",
    "/inventory/reports/clearing-reconciliation",
    "inventory",
    "Inventory clearing reconciliation report.",
    [PERMISSIONS.inventory.view],
  ),
  route("inventory.report.clearingVariance", "Clearing variance", "/inventory/reports/clearing-variance", "inventory", "Inventory clearing variance report.", [
    PERMISSIONS.inventory.view,
  ]),
  route("inventory.fifoPreview", "FIFO cost layers", "/inventory/fifo-preview", "inventory", "FIFO cost layer preview workspace.", [PERMISSIONS.inventory.view]),
  route("inventory.binLocations", "Bin locations", "/inventory/bin-locations", "inventory", "Inventory bin location setup.", [PERMISSIONS.inventory.view]),
  route("inventory.batches", "Batches/lots", "/inventory/batches", "inventory", "Inventory batch and lot tracking workspace.", [PERMISSIONS.inventory.view]),
  route("inventory.serialNumbers", "Serial numbers", "/inventory/serial-numbers", "inventory", "Inventory serial number tracking workspace.", [PERMISSIONS.inventory.view]),
  route("inventory.landedCost", "Landed cost preview", "/inventory/landed-cost", "inventory", "Landed cost preview workspace.", [PERMISSIONS.inventory.view]),
  route("inventory.valuationVariances", "Valuation variances", "/inventory/valuation-variances", "inventory", "Inventory valuation variance review.", [
    PERMISSIONS.inventory.view,
  ]),
  route("inventory.varianceProposals", "Variance proposals", "/inventory/variance-proposals", "inventory", "Inventory variance proposal list.", [
    PERMISSIONS.inventory.varianceProposalsView,
  ]),
  route("inventory.settings", "Inventory settings", "/inventory/settings", "inventory", "Inventory configuration workspace.", [PERMISSIONS.inventory.view]),

  route("documents", "Documents", "/documents", "documents", "Generated and uploaded business document workspace.", [
    PERMISSIONS.generatedDocuments.view,
    PERMISSIONS.documents.view,
  ], {
    shellVisible: true,
    sensitivity: ["storage"],
  }),
  route("documentInbox", "Document inbox", "/document-inbox", "documents", "Uploaded bill and receipt extraction review queue.", [
    PERMISSIONS.documentInbox.view,
  ], {
    shellVisible: true,
    sensitivity: ["storage", "provider"],
  }),
  route("tax.workspace", "VAT", "/tax", "compliance", "Tax workspace and VAT workflow shortcut.", [PERMISSIONS.reports.view], {
    mobileVisible: true,
    sensitivity: ["compliance"],
  }),

  route("reports", "Reports", "/reports", "reports", "Reports index and accounting statement workspace.", [PERMISSIONS.reports.view], {
    shellVisible: true,
    mobileVisible: true,
  }),
  route("reports.generalLedger", "General Ledger", "/reports/general-ledger", "reports", "General ledger report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Financial statements",
  }),
  route("reports.trialBalance", "Trial Balance", "/reports/trial-balance", "reports", "Trial balance report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Financial statements",
  }),
  route("reports.profitLoss", "Profit & Loss", "/reports/profit-and-loss", "reports", "Profit and loss report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Financial statements",
  }),
  route("reports.balanceSheet", "Balance Sheet", "/reports/balance-sheet", "reports", "Balance sheet report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Financial statements",
  }),
  route("reports.cashFlow", "Cash Flow", "/reports/cash-flow", "reports", "Cash flow report from posted cash and bank journal lines.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Management reports",
  }),
  route("reports.revenueTrend", "Revenue Trend", "/reports/revenue-trend", "reports", "Revenue trend report from posted revenue journal lines.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Management reports",
  }),
  route("reports.fxActivity", "FX Activity & Exposure", "/reports/fx-activity", "reports", "Read-only realized, unrealized, rate snapshot, and open foreign exposure reports.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Management reports",
  }),
  route("reports.topCustomers", "Top Customers", "/reports/top-customers", "reports", "Top customers report from finalized sales invoices.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Management reports",
  }),
  route(
    "reports.topProductsServices",
    "Top Products & Services",
    "/reports/top-products-services",
    "reports",
    "Top products and services report from finalized sales invoice lines.",
    [PERMISSIONS.reports.view],
    {
      sidebarGroup: "Management reports",
    },
  ),
  route("reports.vatSummary", "VAT Summary", "/reports/vat-summary", "reports", "VAT summary report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Tax reports",
    sensitivity: ["compliance"],
  }),
  route("reports.vatReturn", "VAT Return", "/reports/vat-return", "reports", "VAT return report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Tax reports",
    sensitivity: ["compliance"],
  }),
  route("reports.agedReceivables", "Aged Receivables", "/reports/aged-receivables", "reports", "Aged receivables report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Aging",
  }),
  route("reports.agedPayables", "Aged Payables", "/reports/aged-payables", "reports", "Aged payables report.", [PERMISSIONS.reports.view], {
    sidebarGroup: "Aging",
  }),
  route("settings.organization", "Organization profile", "/organization/setup", "settings", "Organization profile and setup route.", [
    PERMISSIONS.organization.view,
    PERMISSIONS.organization.update,
  ]),
  route("settings.team", "Users and roles", "/settings/team", "settings", "Team member and user administration route.", [PERMISSIONS.users.view], {
    shellVisible: true,
    activePrefix: "/settings",
  }),
  route("settings.taxRates", "Taxes / VAT", "/tax-rates", "settings", "Tax rate and VAT setup route.", [PERMISSIONS.taxRates.view], {
    sensitivity: ["compliance"],
  }),
  route("settings.numbering", "Numbering", "/settings/number-sequences", "settings", "Number sequence configuration route.", [PERMISSIONS.numberSequences.view]),
  route("settings.documents", "Document settings", "/settings/documents", "settings", "Document template and output settings.", [PERMISSIONS.documentSettings.view], {
    sensitivity: ["storage"],
  }),
  route("settings.storage", "Storage settings", "/settings/storage", "settings", "Storage readiness and generated document storage settings.", [
    PERMISSIONS.documentSettings.view,
    PERMISSIONS.attachments.manage,
  ], {
    sensitivity: ["storage"],
  }),
  route("settings.payments", "Payment readiness", "/settings/payments", "settings", "Stripe payment-link readiness, webhook, and provider-disabled status.", [
    PERMISSIONS.payments.providerReadinessView,
  ], {
    sensitivity: ["provider"],
  }),
  route(
    "settings.bankIntegrations",
    "Bank integration readiness",
    "/settings/bank-integrations",
    "settings",
    "Wio-shaped bank integration readiness, disabled-provider state, feed, beneficiary, and vendor-payment blockers.",
    [PERMISSIONS.bankIntegrations.connectionManage, PERMISSIONS.bankIntegrations.feedRead],
    {
      sensitivity: ["provider"],
    },
  ),
  route("settings.apiDocs", "API docs", "/settings/api-docs", "settings", "OpenAPI documentation access and beta endpoint guidance.", [PERMISSIONS.users.view], {
    sensitivity: ["provider"],
  }),
  route("settings.webhooks", "Webhook outbox", "/settings/webhooks", "settings", "Outbound webhook and event outbox readiness without external delivery.", [
    PERMISSIONS.users.manage,
  ], {
    sensitivity: ["provider"],
  }),
  route(
    "settings.importExport",
    "Import and export",
    "/settings/import-export",
    "settings",
    "Local CSV templates, preview validation, guarded import commits, and safe master-data exports.",
    [PERMISSIONS.migrationToolkit.view],
    {
      sensitivity: ["storage"],
    },
  ),
  route("settings.compliance", "Compliance settings", "/settings/compliance", "settings", "Compliance readiness and provider planning settings.", [
    PERMISSIONS.compliance.view,
  ], {
    shellVisible: true,
    activePrefix: "/settings",
    sensitivity: ["compliance", "provider"],
  }),
  route("settings.security", "Security", "/settings/security", "settings", "Security and account protection settings.", [PERMISSIONS.users.view]),
  route("settings.branches", "Branches", "/branches", "settings", "Branch setup and organization structure route.", [PERMISSIONS.organization.view]),
  route("settings.roles", "Roles & Permissions", "/settings/roles", "settings", "Role and permission administration route.", [PERMISSIONS.roles.view]),
  route("settings.bankingAccounting", "Banking accounting", "/settings/banking-accounting", "settings", "Banking accounting configuration route.", [
    PERMISSIONS.accounts.view,
  ]),
  route(
    "settings.currenciesFx",
    "Currencies and FX",
    "/settings/currencies-fx",
    "settings",
    "Manual exchange-rate evidence, FX account configuration, and foreign-document posting readiness.",
    [PERMISSIONS.currencies.read],
  ),
  route("settings.emailOutbox", "Email outbox", "/settings/email-outbox", "settings", "Email outbox review settings route.", [PERMISSIONS.emailOutbox.view]),
  route("settings.auditLogs", "Audit logs", "/settings/audit-logs", "settings", "Audit log review route.", [PERMISSIONS.auditLogs.view]),
  route("settings.zatca", "ZATCA readiness", "/settings/zatca", "settings", "KSA ZATCA local-readiness settings route.", [PERMISSIONS.zatca.view], {
    sensitivity: ["compliance", "provider"],
  }),

  route("inbox", "Inbox", "/inbox", "future", "Planned exception inbox capability placeholder.", [PERMISSIONS.dashboard.view], {
    capabilityStatus: "planned",
  }),
  route("ai.proposals", "AI proposals", "/ai/proposals", "future", "Planned assistant proposal review capability placeholder.", [PERMISSIONS.dashboard.view], {
    capabilityStatus: "planned",
  }),
  route("reportPacks", "Report packs", "/report-packs", "future", "Planned report pack generation capability placeholder.", [PERMISSIONS.reports.view], {
    capabilityStatus: "planned",
  }),
  route("integrationHealth", "Integration health", "/integrations/health", "future", "Planned integration health review capability placeholder.", [
    PERMISSIONS.users.manage,
    PERMISSIONS.roles.manage,
  ], {
    capabilityStatus: "planned",
    sensitivity: ["provider"],
  }),
] as const satisfies readonly AppRouteDefinition[];

export type AppRoute = (typeof APP_ROUTES)[number];
export type AppRouteKey = AppRoute["key"];

const routesByKey = new Map<AppRouteKey, AppRoute>(APP_ROUTES.map((candidate) => [candidate.key, candidate]));
const knownRouteKeys = new Set<string>(APP_ROUTES.map((candidate) => candidate.key));
const knownRouteHrefs = new Set<string>(APP_ROUTES.map((candidate) => candidate.href));

export function getAppRouteByKey(key: AppRouteKey): AppRoute | undefined {
  return routesByKey.get(key);
}

export function getVisibleShellRoutes(): AppRoute[] {
  return APP_ROUTES.filter((routeDefinition) => routeDefinition.capabilityStatus === "active" && routeDefinition.shellVisible);
}

export function getMobileShellRoutes(): AppRoute[] {
  return APP_ROUTES.filter((routeDefinition) => routeDefinition.capabilityStatus === "active" && routeDefinition.mobileVisible);
}

export function getRoutesBySection(section: AppRouteSection): AppRoute[] {
  return APP_ROUTES.filter((routeDefinition) => routeDefinition.section === section);
}

export function isKnownAppRoute(value: string): boolean {
  return knownRouteKeys.has(value) || knownRouteHrefs.has(value);
}

function route<const Key extends string, const Label extends string, const Href extends string>(
  key: Key,
  label: Label,
  href: Href,
  section: AppRouteSection,
  description: string,
  requiredAny: readonly Permission[],
  options: Omit<Partial<AppRouteDefinition>, "key" | "label" | "href" | "section" | "description" | "requiredAny"> = {},
): AppRouteDefinition & { key: Key; label: Label; href: Href } {
  return {
    key,
    label,
    href,
    section,
    description,
    capabilityStatus: options.capabilityStatus ?? "active",
    shellVisible: options.shellVisible ?? false,
    mobileVisible: options.mobileVisible,
    mobileLabel: options.mobileLabel,
    requiredAny,
    activePrefix: options.activePrefix,
    sidebarGroup: options.sidebarGroup,
    sensitivity: options.sensitivity,
  };
}
