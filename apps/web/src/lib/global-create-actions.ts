import {
  BadgeDollarSign,
  Banknote,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileClock,
  FileMinus,
  FilePlus2,
  FileText,
  HandCoins,
  Landmark,
  ListChecks,
  PackagePlus,
  Receipt,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Timer,
  Truck,
  UserPlus,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

export type GlobalCreateCategory =
  | "Customers / Sales"
  | "Suppliers / Purchases"
  | "Team / Time"
  | "Other / Accounting";

export type GlobalCreateModule =
  | "sales"
  | "customerPayments"
  | "customerStatements"
  | "estimates"
  | "salesOrders"
  | "creditNotes"
  | "salesReceipts"
  | "customerRefunds"
  | "delayedCredits"
  | "delayedCharges"
  | "contacts"
  | "cashExpenses"
  | "cheques"
  | "purchaseBills"
  | "supplierPayments"
  | "purchaseOrders"
  | "purchaseReceiving"
  | "supplierCredits"
  | "creditCardCredits"
  | "timeTracking"
  | "tasks"
  | "bankDeposits"
  | "bankTransfers"
  | "journals"
  | "inventoryAdjustments"
  | "creditCards"
  | "items";

export interface GlobalCreateAction {
  id: string;
  label: string;
  category: GlobalCreateCategory;
  icon: LucideIcon;
  href?: string;
  requiredPermission: Permission;
  requiredModule?: GlobalCreateModule;
  disabledReason?: string;
  permissionDeniedReason?: string;
}

export const GLOBAL_CREATE_CATEGORY_ORDER: readonly GlobalCreateCategory[] = [
  "Customers / Sales",
  "Suppliers / Purchases",
  "Team / Time",
  "Other / Accounting",
];

export const ENABLED_GLOBAL_CREATE_MODULES: Record<GlobalCreateModule, boolean> = {
  sales: true,
  customerPayments: true,
  customerStatements: false,
  estimates: false,
  salesOrders: false,
  creditNotes: true,
  salesReceipts: false,
  customerRefunds: true,
  delayedCredits: false,
  delayedCharges: false,
  contacts: true,
  cashExpenses: true,
  cheques: false,
  purchaseBills: true,
  supplierPayments: true,
  purchaseOrders: true,
  purchaseReceiving: true,
  supplierCredits: true,
  creditCardCredits: false,
  timeTracking: false,
  tasks: false,
  bankDeposits: false,
  bankTransfers: true,
  journals: true,
  inventoryAdjustments: true,
  creditCards: false,
  items: true,
};

export const GLOBAL_CREATE_ACTIONS: readonly GlobalCreateAction[] = [
  {
    id: "sales-invoice",
    label: "Invoice",
    category: "Customers / Sales",
    icon: ReceiptText,
    href: "/sales/invoices/new",
    requiredPermission: PERMISSIONS.salesInvoices.create,
    requiredModule: "sales",
  },
  {
    id: "receive-payment",
    label: "Receive payment",
    category: "Customers / Sales",
    icon: HandCoins,
    href: "/sales/customer-payments/new",
    requiredPermission: PERMISSIONS.customerPayments.create,
    requiredModule: "customerPayments",
  },
  {
    id: "statement",
    label: "Statement",
    category: "Customers / Sales",
    icon: FileText,
    requiredPermission: PERMISSIONS.salesInvoices.view,
    requiredModule: "customerStatements",
    disabledReason: "Statements are not enabled yet.",
  },
  {
    id: "estimate",
    label: "Estimate",
    category: "Customers / Sales",
    icon: FileClock,
    requiredPermission: PERMISSIONS.salesInvoices.create,
    requiredModule: "estimates",
    disabledReason: "Estimates are not enabled yet.",
  },
  {
    id: "sales-order",
    label: "Sales order",
    category: "Customers / Sales",
    icon: ClipboardList,
    requiredPermission: PERMISSIONS.salesInvoices.create,
    requiredModule: "salesOrders",
    disabledReason: "Sales orders are not enabled yet.",
  },
  {
    id: "credit-note",
    label: "Credit note",
    category: "Customers / Sales",
    icon: FileMinus,
    href: "/sales/credit-notes/new",
    requiredPermission: PERMISSIONS.creditNotes.create,
    requiredModule: "creditNotes",
  },
  {
    id: "sales-receipt",
    label: "Sales receipt",
    category: "Customers / Sales",
    icon: Receipt,
    requiredPermission: PERMISSIONS.salesInvoices.create,
    requiredModule: "salesReceipts",
    disabledReason: "Sales receipts are not enabled yet.",
  },
  {
    id: "refund-receipt",
    label: "Refund receipt",
    category: "Customers / Sales",
    icon: RotateCcw,
    href: "/sales/customer-refunds/new",
    requiredPermission: PERMISSIONS.customerRefunds.create,
    requiredModule: "customerRefunds",
  },
  {
    id: "delayed-credit",
    label: "Delayed credit",
    category: "Customers / Sales",
    icon: FileClock,
    requiredPermission: PERMISSIONS.creditNotes.create,
    requiredModule: "delayedCredits",
    disabledReason: "Delayed credits are not enabled yet.",
  },
  {
    id: "delayed-charge",
    label: "Delayed charge",
    category: "Customers / Sales",
    icon: BadgeDollarSign,
    requiredPermission: PERMISSIONS.salesInvoices.create,
    requiredModule: "delayedCharges",
    disabledReason: "Delayed charges are not enabled yet.",
  },
  {
    id: "add-customer",
    label: "Add customer",
    category: "Customers / Sales",
    icon: UserPlus,
    href: "/contacts?type=CUSTOMER",
    requiredPermission: PERMISSIONS.contacts.manage,
    requiredModule: "contacts",
    permissionDeniedReason: "You do not have permission to manage contacts.",
  },
  {
    id: "expense",
    label: "Expense",
    category: "Suppliers / Purchases",
    icon: WalletCards,
    href: "/purchases/cash-expenses/new",
    requiredPermission: PERMISSIONS.cashExpenses.create,
    requiredModule: "cashExpenses",
  },
  {
    id: "cheque",
    label: "Cheque",
    category: "Suppliers / Purchases",
    icon: Banknote,
    requiredPermission: PERMISSIONS.cashExpenses.create,
    requiredModule: "cheques",
    disabledReason: "Cheque workflow is not enabled yet.",
  },
  {
    id: "bill",
    label: "Bill",
    category: "Suppliers / Purchases",
    icon: ShoppingCart,
    href: "/purchases/bills/new",
    requiredPermission: PERMISSIONS.purchaseBills.create,
    requiredModule: "purchaseBills",
  },
  {
    id: "pay-bills",
    label: "Pay bills",
    category: "Suppliers / Purchases",
    icon: HandCoins,
    href: "/purchases/supplier-payments/new",
    requiredPermission: PERMISSIONS.supplierPayments.create,
    requiredModule: "supplierPayments",
  },
  {
    id: "purchase-order",
    label: "Purchase order",
    category: "Suppliers / Purchases",
    icon: ClipboardList,
    href: "/purchases/purchase-orders/new",
    requiredPermission: PERMISSIONS.purchaseOrders.create,
    requiredModule: "purchaseOrders",
  },
  {
    id: "item-receipt",
    label: "Item receipt",
    category: "Suppliers / Purchases",
    icon: Truck,
    href: "/inventory/purchase-receipts/new",
    requiredPermission: PERMISSIONS.purchaseReceiving.create,
    requiredModule: "purchaseReceiving",
  },
  {
    id: "supplier-credit",
    label: "Supplier credit",
    category: "Suppliers / Purchases",
    icon: FileMinus,
    href: "/purchases/debit-notes/new",
    requiredPermission: PERMISSIONS.purchaseDebitNotes.create,
    requiredModule: "supplierCredits",
  },
  {
    id: "credit-card-credit",
    label: "Credit card credit",
    category: "Suppliers / Purchases",
    icon: CreditCard,
    requiredPermission: PERMISSIONS.cashExpenses.create,
    requiredModule: "creditCardCredits",
    disabledReason: "Credit card credit workflow is not enabled yet.",
  },
  {
    id: "add-supplier",
    label: "Add supplier",
    category: "Suppliers / Purchases",
    icon: Users,
    href: "/contacts?type=SUPPLIER",
    requiredPermission: PERMISSIONS.contacts.manage,
    requiredModule: "contacts",
    permissionDeniedReason: "You do not have permission to manage contacts.",
  },
  {
    id: "single-time-activity",
    label: "Single time activity",
    category: "Team / Time",
    icon: Timer,
    requiredPermission: PERMISSIONS.users.view,
    requiredModule: "timeTracking",
    disabledReason: "Time tracking is not enabled yet.",
  },
  {
    id: "weekly-timesheet",
    label: "Weekly timesheet",
    category: "Team / Time",
    icon: CalendarClock,
    requiredPermission: PERMISSIONS.users.view,
    requiredModule: "timeTracking",
    disabledReason: "Time tracking is not enabled yet.",
  },
  {
    id: "task",
    label: "Task",
    category: "Other / Accounting",
    icon: ListChecks,
    requiredPermission: PERMISSIONS.dashboard.view,
    requiredModule: "tasks",
    disabledReason: "Task workflow is not enabled yet.",
  },
  {
    id: "bank-deposit",
    label: "Bank deposit",
    category: "Other / Accounting",
    icon: Landmark,
    requiredPermission: PERMISSIONS.bankAccounts.manage,
    requiredModule: "bankDeposits",
    disabledReason: "Bank deposits are not enabled yet.",
  },
  {
    id: "transfer",
    label: "Transfer",
    category: "Other / Accounting",
    icon: Building2,
    href: "/bank-transfers/new",
    requiredPermission: PERMISSIONS.bankTransfers.create,
    requiredModule: "bankTransfers",
  },
  {
    id: "journal-entry",
    label: "Journal entry",
    category: "Other / Accounting",
    icon: FilePlus2,
    href: "/journal-entries/new",
    requiredPermission: PERMISSIONS.journals.create,
    requiredModule: "journals",
  },
  {
    id: "inventory-quantity-adjustment",
    label: "Inventory quantity adjustment",
    category: "Other / Accounting",
    icon: Boxes,
    href: "/inventory/adjustments/new",
    requiredPermission: PERMISSIONS.inventoryAdjustments.create,
    requiredModule: "inventoryAdjustments",
  },
  {
    id: "pay-down-credit-card",
    label: "Pay down credit card",
    category: "Other / Accounting",
    icon: CreditCard,
    requiredPermission: PERMISSIONS.bankTransfers.create,
    requiredModule: "creditCards",
    disabledReason: "Credit card payoff workflow is not enabled yet.",
  },
  {
    id: "add-product-service",
    label: "Add product/service",
    category: "Other / Accounting",
    icon: PackagePlus,
    href: "/items",
    requiredPermission: PERMISSIONS.items.manage,
    requiredModule: "items",
    permissionDeniedReason: "You do not have permission to manage products or services.",
  },
];
