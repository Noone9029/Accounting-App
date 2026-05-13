export const PERMISSIONS = {
  organization: {
    view: "organization.view",
    update: "organization.update",
  },
  users: {
    view: "users.view",
    invite: "users.invite",
    manage: "users.manage",
  },
  roles: {
    view: "roles.view",
    manage: "roles.manage",
  },
  accounts: {
    view: "accounts.view",
    manage: "accounts.manage",
  },
  bankAccounts: {
    view: "bankAccounts.view",
    manage: "bankAccounts.manage",
    transactionsView: "bankAccounts.transactions.view",
  },
  taxRates: {
    view: "taxRates.view",
    manage: "taxRates.manage",
  },
  journals: {
    view: "journals.view",
    create: "journals.create",
    post: "journals.post",
    reverse: "journals.reverse",
  },
  fiscalPeriods: {
    view: "fiscalPeriods.view",
    manage: "fiscalPeriods.manage",
    lock: "fiscalPeriods.lock",
  },
  contacts: {
    view: "contacts.view",
    manage: "contacts.manage",
  },
  items: {
    view: "items.view",
    manage: "items.manage",
  },
  salesInvoices: {
    view: "salesInvoices.view",
    create: "salesInvoices.create",
    update: "salesInvoices.update",
    finalize: "salesInvoices.finalize",
    void: "salesInvoices.void",
  },
  customerPayments: {
    view: "customerPayments.view",
    create: "customerPayments.create",
    void: "customerPayments.void",
  },
  creditNotes: {
    view: "creditNotes.view",
    create: "creditNotes.create",
    finalize: "creditNotes.finalize",
    void: "creditNotes.void",
  },
  customerRefunds: {
    view: "customerRefunds.view",
    create: "customerRefunds.create",
    void: "customerRefunds.void",
  },
  purchaseBills: {
    view: "purchaseBills.view",
    create: "purchaseBills.create",
    update: "purchaseBills.update",
    finalize: "purchaseBills.finalize",
    void: "purchaseBills.void",
  },
  purchaseOrders: {
    view: "purchaseOrders.view",
    create: "purchaseOrders.create",
    update: "purchaseOrders.update",
    approve: "purchaseOrders.approve",
    void: "purchaseOrders.void",
    convertToBill: "purchaseOrders.convertToBill",
  },
  supplierPayments: {
    view: "supplierPayments.view",
    create: "supplierPayments.create",
    void: "supplierPayments.void",
  },
  purchaseDebitNotes: {
    view: "purchaseDebitNotes.view",
    create: "purchaseDebitNotes.create",
    finalize: "purchaseDebitNotes.finalize",
    void: "purchaseDebitNotes.void",
  },
  supplierRefunds: {
    view: "supplierRefunds.view",
    create: "supplierRefunds.create",
    void: "supplierRefunds.void",
  },
  cashExpenses: {
    view: "cashExpenses.view",
    create: "cashExpenses.create",
    void: "cashExpenses.void",
  },
  reports: {
    view: "reports.view",
    export: "reports.export",
  },
  documents: {
    view: "documents.view",
    download: "documents.download",
  },
  documentSettings: {
    view: "documentSettings.view",
    manage: "documentSettings.manage",
  },
  zatca: {
    view: "zatca.view",
    manage: "zatca.manage",
    generateXml: "zatca.generateXml",
    runChecks: "zatca.runChecks",
  },
  generatedDocuments: {
    view: "generatedDocuments.view",
    download: "generatedDocuments.download",
  },
  admin: {
    fullAccess: "admin.fullAccess",
  },
} as const;

type DeepValue<T> = T extends string ? T : T[keyof T] extends infer Value ? DeepValue<Value> : never;

export type Permission = DeepValue<typeof PERMISSIONS>;

export const ALL_PERMISSIONS = [
  PERMISSIONS.organization.view,
  PERMISSIONS.organization.update,
  PERMISSIONS.users.view,
  PERMISSIONS.users.invite,
  PERMISSIONS.users.manage,
  PERMISSIONS.roles.view,
  PERMISSIONS.roles.manage,
  PERMISSIONS.accounts.view,
  PERMISSIONS.accounts.manage,
  PERMISSIONS.bankAccounts.view,
  PERMISSIONS.bankAccounts.manage,
  PERMISSIONS.bankAccounts.transactionsView,
  PERMISSIONS.taxRates.view,
  PERMISSIONS.taxRates.manage,
  PERMISSIONS.journals.view,
  PERMISSIONS.journals.create,
  PERMISSIONS.journals.post,
  PERMISSIONS.journals.reverse,
  PERMISSIONS.fiscalPeriods.view,
  PERMISSIONS.fiscalPeriods.manage,
  PERMISSIONS.fiscalPeriods.lock,
  PERMISSIONS.contacts.view,
  PERMISSIONS.contacts.manage,
  PERMISSIONS.items.view,
  PERMISSIONS.items.manage,
  PERMISSIONS.salesInvoices.view,
  PERMISSIONS.salesInvoices.create,
  PERMISSIONS.salesInvoices.update,
  PERMISSIONS.salesInvoices.finalize,
  PERMISSIONS.salesInvoices.void,
  PERMISSIONS.customerPayments.view,
  PERMISSIONS.customerPayments.create,
  PERMISSIONS.customerPayments.void,
  PERMISSIONS.creditNotes.view,
  PERMISSIONS.creditNotes.create,
  PERMISSIONS.creditNotes.finalize,
  PERMISSIONS.creditNotes.void,
  PERMISSIONS.customerRefunds.view,
  PERMISSIONS.customerRefunds.create,
  PERMISSIONS.customerRefunds.void,
  PERMISSIONS.purchaseBills.view,
  PERMISSIONS.purchaseBills.create,
  PERMISSIONS.purchaseBills.update,
  PERMISSIONS.purchaseBills.finalize,
  PERMISSIONS.purchaseBills.void,
  PERMISSIONS.purchaseOrders.view,
  PERMISSIONS.purchaseOrders.create,
  PERMISSIONS.purchaseOrders.update,
  PERMISSIONS.purchaseOrders.approve,
  PERMISSIONS.purchaseOrders.void,
  PERMISSIONS.purchaseOrders.convertToBill,
  PERMISSIONS.supplierPayments.view,
  PERMISSIONS.supplierPayments.create,
  PERMISSIONS.supplierPayments.void,
  PERMISSIONS.purchaseDebitNotes.view,
  PERMISSIONS.purchaseDebitNotes.create,
  PERMISSIONS.purchaseDebitNotes.finalize,
  PERMISSIONS.purchaseDebitNotes.void,
  PERMISSIONS.supplierRefunds.view,
  PERMISSIONS.supplierRefunds.create,
  PERMISSIONS.supplierRefunds.void,
  PERMISSIONS.cashExpenses.view,
  PERMISSIONS.cashExpenses.create,
  PERMISSIONS.cashExpenses.void,
  PERMISSIONS.reports.view,
  PERMISSIONS.reports.export,
  PERMISSIONS.documents.view,
  PERMISSIONS.documents.download,
  PERMISSIONS.documentSettings.view,
  PERMISSIONS.documentSettings.manage,
  PERMISSIONS.zatca.view,
  PERMISSIONS.zatca.manage,
  PERMISSIONS.zatca.generateXml,
  PERMISSIONS.zatca.runChecks,
  PERMISSIONS.generatedDocuments.view,
  PERMISSIONS.generatedDocuments.download,
  PERMISSIONS.admin.fullAccess,
] as const satisfies readonly Permission[];

export const LEGACY_FULL_ACCESS_PERMISSION = "*";

const ADMIN_ROLE_PERMISSIONS = ALL_PERMISSIONS.filter((permission) => permission !== PERMISSIONS.admin.fullAccess);

const ACCOUNTANT_ROLE_PERMISSIONS = [
  PERMISSIONS.organization.view,
  PERMISSIONS.accounts.view,
  PERMISSIONS.accounts.manage,
  PERMISSIONS.bankAccounts.view,
  PERMISSIONS.bankAccounts.manage,
  PERMISSIONS.bankAccounts.transactionsView,
  PERMISSIONS.taxRates.view,
  PERMISSIONS.taxRates.manage,
  PERMISSIONS.journals.view,
  PERMISSIONS.journals.create,
  PERMISSIONS.journals.post,
  PERMISSIONS.journals.reverse,
  PERMISSIONS.fiscalPeriods.view,
  PERMISSIONS.fiscalPeriods.manage,
  PERMISSIONS.contacts.view,
  PERMISSIONS.items.view,
  PERMISSIONS.salesInvoices.view,
  PERMISSIONS.salesInvoices.finalize,
  PERMISSIONS.salesInvoices.void,
  PERMISSIONS.customerPayments.view,
  PERMISSIONS.customerPayments.create,
  PERMISSIONS.customerPayments.void,
  PERMISSIONS.creditNotes.view,
  PERMISSIONS.creditNotes.create,
  PERMISSIONS.creditNotes.finalize,
  PERMISSIONS.creditNotes.void,
  PERMISSIONS.customerRefunds.view,
  PERMISSIONS.customerRefunds.create,
  PERMISSIONS.customerRefunds.void,
  PERMISSIONS.purchaseBills.view,
  PERMISSIONS.purchaseBills.finalize,
  PERMISSIONS.purchaseBills.void,
  PERMISSIONS.purchaseOrders.view,
  PERMISSIONS.purchaseOrders.create,
  PERMISSIONS.purchaseOrders.update,
  PERMISSIONS.purchaseOrders.approve,
  PERMISSIONS.purchaseOrders.void,
  PERMISSIONS.purchaseOrders.convertToBill,
  PERMISSIONS.supplierPayments.view,
  PERMISSIONS.supplierPayments.create,
  PERMISSIONS.supplierPayments.void,
  PERMISSIONS.purchaseDebitNotes.view,
  PERMISSIONS.purchaseDebitNotes.create,
  PERMISSIONS.purchaseDebitNotes.finalize,
  PERMISSIONS.purchaseDebitNotes.void,
  PERMISSIONS.supplierRefunds.view,
  PERMISSIONS.supplierRefunds.create,
  PERMISSIONS.supplierRefunds.void,
  PERMISSIONS.cashExpenses.view,
  PERMISSIONS.cashExpenses.create,
  PERMISSIONS.cashExpenses.void,
  PERMISSIONS.reports.view,
  PERMISSIONS.reports.export,
  PERMISSIONS.documents.view,
  PERMISSIONS.documents.download,
  PERMISSIONS.documentSettings.view,
  PERMISSIONS.generatedDocuments.view,
  PERMISSIONS.generatedDocuments.download,
  PERMISSIONS.zatca.view,
  PERMISSIONS.zatca.generateXml,
  PERMISSIONS.zatca.runChecks,
] as const satisfies readonly Permission[];

const SALES_ROLE_PERMISSIONS = [
  PERMISSIONS.organization.view,
  PERMISSIONS.contacts.view,
  PERMISSIONS.contacts.manage,
  PERMISSIONS.items.view,
  PERMISSIONS.salesInvoices.view,
  PERMISSIONS.salesInvoices.create,
  PERMISSIONS.salesInvoices.update,
  PERMISSIONS.customerPayments.view,
  PERMISSIONS.customerPayments.create,
  PERMISSIONS.creditNotes.view,
  PERMISSIONS.creditNotes.create,
  PERMISSIONS.customerRefunds.view,
  PERMISSIONS.documents.view,
  PERMISSIONS.documents.download,
  PERMISSIONS.generatedDocuments.view,
  PERMISSIONS.generatedDocuments.download,
] as const satisfies readonly Permission[];

const PURCHASES_ROLE_PERMISSIONS = [
  PERMISSIONS.organization.view,
  PERMISSIONS.contacts.view,
  PERMISSIONS.contacts.manage,
  PERMISSIONS.items.view,
  PERMISSIONS.bankAccounts.view,
  PERMISSIONS.bankAccounts.transactionsView,
  PERMISSIONS.purchaseOrders.view,
  PERMISSIONS.purchaseOrders.create,
  PERMISSIONS.purchaseOrders.update,
  PERMISSIONS.purchaseOrders.approve,
  PERMISSIONS.purchaseOrders.void,
  PERMISSIONS.purchaseOrders.convertToBill,
  PERMISSIONS.purchaseBills.view,
  PERMISSIONS.purchaseBills.create,
  PERMISSIONS.purchaseBills.update,
  PERMISSIONS.supplierPayments.view,
  PERMISSIONS.supplierPayments.create,
  PERMISSIONS.purchaseDebitNotes.view,
  PERMISSIONS.purchaseDebitNotes.create,
  PERMISSIONS.supplierRefunds.view,
  PERMISSIONS.cashExpenses.view,
  PERMISSIONS.cashExpenses.create,
  PERMISSIONS.documents.view,
  PERMISSIONS.documents.download,
  PERMISSIONS.generatedDocuments.view,
  PERMISSIONS.generatedDocuments.download,
] as const satisfies readonly Permission[];

const VIEWER_ROLE_PERMISSIONS = [
  PERMISSIONS.organization.view,
  PERMISSIONS.accounts.view,
  PERMISSIONS.taxRates.view,
  PERMISSIONS.journals.view,
  PERMISSIONS.fiscalPeriods.view,
  PERMISSIONS.contacts.view,
  PERMISSIONS.items.view,
  PERMISSIONS.salesInvoices.view,
  PERMISSIONS.customerPayments.view,
  PERMISSIONS.creditNotes.view,
  PERMISSIONS.customerRefunds.view,
  PERMISSIONS.purchaseOrders.view,
  PERMISSIONS.purchaseBills.view,
  PERMISSIONS.supplierPayments.view,
  PERMISSIONS.purchaseDebitNotes.view,
  PERMISSIONS.supplierRefunds.view,
  PERMISSIONS.cashExpenses.view,
  PERMISSIONS.reports.view,
  PERMISSIONS.documents.view,
  PERMISSIONS.documents.download,
  PERMISSIONS.documentSettings.view,
  PERMISSIONS.generatedDocuments.view,
  PERMISSIONS.generatedDocuments.download,
  PERMISSIONS.zatca.view,
] as const satisfies readonly Permission[];

export const DEFAULT_ROLE_PERMISSIONS = {
  Owner: ALL_PERMISSIONS,
  Admin: ADMIN_ROLE_PERMISSIONS,
  Accountant: ACCOUNTANT_ROLE_PERMISSIONS,
  Sales: SALES_ROLE_PERMISSIONS,
  Purchases: PURCHASES_ROLE_PERMISSIONS,
  Viewer: VIEWER_ROLE_PERMISSIONS,
} as const satisfies Record<string, readonly Permission[]>;

export type DefaultRoleName = keyof typeof DEFAULT_ROLE_PERMISSIONS;

export function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((permission): permission is string => typeof permission === "string");
  }

  if (isRecord(value) && Array.isArray(value.permissions)) {
    return value.permissions.filter((permission): permission is string => typeof permission === "string");
  }

  return [];
}

export function isFullAccess(permissions: unknown): boolean {
  const normalized = normalizePermissions(permissions);
  return normalized.includes(PERMISSIONS.admin.fullAccess) || normalized.includes(LEGACY_FULL_ACCESS_PERMISSION);
}

export function hasPermission(permissions: unknown, permission: Permission | string): boolean {
  const normalized = normalizePermissions(permissions);
  return isFullAccess(normalized) || normalized.includes(permission);
}

export function hasAnyPermission(permissions: unknown, requiredPermissions: readonly (Permission | string)[]): boolean {
  return requiredPermissions.length === 0 || requiredPermissions.some((permission) => hasPermission(permissions, permission));
}

export function hasAllPermissions(permissions: unknown, requiredPermissions: readonly (Permission | string)[]): boolean {
  return requiredPermissions.every((permission) => hasPermission(permissions, permission));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
