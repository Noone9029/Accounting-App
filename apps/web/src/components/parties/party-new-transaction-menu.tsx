"use client";

import {
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileInput,
  FileText,
  PackageCheck,
  Receipt,
  RotateCcw,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buildPartyTransactionHref, type PartyKind } from "@/lib/parties";
import { hasPermission, PERMISSIONS, type Permission, type PermissionSubject } from "@/lib/permissions";

export type PartyNewTransactionModule =
  | "salesInvoices"
  | "customerPayments"
  | "estimates"
  | "salesOrders"
  | "creditNotes"
  | "customerRefunds"
  | "salesReceipts"
  | "delayedCredits"
  | "delayedCharges"
  | "statements"
  | "purchaseBills"
  | "cashExpenses"
  | "cheques"
  | "purchaseOrders"
  | "purchaseDebitNotes"
  | "creditCardPayments"
  | "importBills"
  | "purchaseReceiving"
  | "timeActivities"
  | "supplierPayments";

export interface PartyNewTransactionMenuProps {
  partyId: string;
  partyType: PartyKind;
  availableModules?: Partial<Record<PartyNewTransactionModule, boolean>>;
  userPermissions: PermissionSubject;
  className?: string;
}

interface PartyTransactionAction {
  id: string;
  label: string;
  partyType: PartyKind;
  icon: LucideIcon;
  href?: string;
  requiredPermission: Permission;
  requiredModule: PartyNewTransactionModule;
  disabledReason?: string;
}

const DEFAULT_AVAILABLE_MODULES: Record<PartyNewTransactionModule, boolean> = {
  salesInvoices: true,
  customerPayments: true,
  estimates: false,
  salesOrders: false,
  creditNotes: true,
  customerRefunds: true,
  salesReceipts: false,
  delayedCredits: false,
  delayedCharges: false,
  statements: false,
  purchaseBills: true,
  cashExpenses: true,
  cheques: false,
  purchaseOrders: true,
  purchaseDebitNotes: true,
  creditCardPayments: false,
  importBills: false,
  purchaseReceiving: true,
  timeActivities: false,
  supplierPayments: true,
};

export function PartyNewTransactionMenu({
  partyId,
  partyType,
  availableModules,
  userPermissions,
  className = "",
}: PartyNewTransactionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const modules = useMemo(() => ({ ...DEFAULT_AVAILABLE_MODULES, ...availableModules }), [availableModules]);
  const actions = useMemo(() => transactionActions(partyType, partyId), [partyId, partyType]);
  const visibleActions = actions.filter((action) => hasPermission(userPermissions, action.requiredPermission));

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleMouseDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm"
      >
        New transaction
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close new transaction menu"
            className="fixed inset-0 z-40 cursor-default bg-slate-950/20 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            role="menu"
            aria-label="New transaction"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-t-md border border-slate-200 bg-white p-3 shadow-2xl sm:absolute sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:rounded-md"
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2 sm:hidden">
              <h2 className="text-sm font-semibold text-ink">New transaction</h2>
              <button type="button" aria-label="Close new transaction menu" onClick={() => setOpen(false)} className="rounded-md border border-slate-200 p-2 text-slate-500">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-1">
              {visibleActions.map((action) => (
                <PartyTransactionMenuItem
                  key={action.id}
                  action={action}
                  moduleEnabled={modules[action.requiredModule]}
                  allowed={hasPermission(userPermissions, action.requiredPermission)}
                  onSelect={() => setOpen(false)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PartyTransactionMenuItem({
  action,
  moduleEnabled,
  allowed,
  onSelect,
}: {
  action: PartyTransactionAction;
  moduleEnabled: boolean;
  allowed: boolean;
  onSelect: () => void;
}) {
  const Icon = action.icon;
  const disabledReason = !moduleEnabled
    ? action.disabledReason ?? `${action.label} is not enabled yet.`
    : !allowed
      ? `You do not have permission to create ${action.label.toLowerCase()}.`
      : !action.href
        ? action.disabledReason ?? `${action.label} is not available yet.`
        : "";
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{action.label}</span>
    </>
  );

  if (!disabledReason && action.href) {
    return (
      <Link
        role="menuitem"
        href={action.href}
        onClick={onSelect}
        className="flex min-h-9 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-mist hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-palm"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled
      title={disabledReason}
      className="flex min-h-9 w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-400"
    >
      {content}
    </button>
  );
}

function transactionActions(partyType: PartyKind, partyId: string): PartyTransactionAction[] {
  if (partyType === "customer") {
    return [
      action("invoice", "Invoice", partyType, FileText, "/sales/invoices/new", PERMISSIONS.salesInvoices.create, "salesInvoices", partyId),
      action("receive-payment", "Receive Payment", partyType, WalletCards, "/sales/customer-payments/new", PERMISSIONS.customerPayments.create, "customerPayments", partyId),
      disabledAction("estimate", "Estimate / Quotation", partyType, ClipboardList, PERMISSIONS.salesInvoices.create, "estimates", "Estimates are not enabled yet."),
      disabledAction("sales-order", "Sales Order", partyType, ClipboardList, PERMISSIONS.salesInvoices.create, "salesOrders", "Sales orders are not enabled yet."),
      action("credit-note", "Credit Note", partyType, RotateCcw, "/sales/credit-notes/new", PERMISSIONS.creditNotes.create, "creditNotes", partyId),
      disabledAction("sales-receipt", "Sales Receipt", partyType, Receipt, PERMISSIONS.salesInvoices.create, "salesReceipts", "Sales receipts are not enabled yet."),
      action("refund-receipt", "Refund Receipt", partyType, RotateCcw, "/sales/customer-refunds/new", PERMISSIONS.customerRefunds.create, "customerRefunds", partyId),
      disabledAction("delayed-credit", "Delayed Credit", partyType, ClipboardList, PERMISSIONS.creditNotes.create, "delayedCredits", "Delayed credits are not enabled yet."),
      disabledAction("delayed-charge", "Delayed Charge", partyType, ClipboardList, PERMISSIONS.salesInvoices.create, "delayedCharges", "Delayed charges are not enabled yet."),
      disabledAction("statement", "Statement", partyType, FileText, PERMISSIONS.contacts.view, "statements", "Customer statements are available from the contact ledger."),
    ];
  }

  return [
    action("bill", "Bill", partyType, FileText, "/purchases/bills/new", PERMISSIONS.purchaseBills.create, "purchaseBills", partyId),
    action("expense", "Expense", partyType, Receipt, "/purchases/cash-expenses/new", PERMISSIONS.cashExpenses.create, "cashExpenses", partyId),
    disabledAction("cheque", "Cheque", partyType, FileText, PERMISSIONS.cashExpenses.create, "cheques", "Cheque entry is not enabled yet."),
    action("purchase-order", "Purchase Order", partyType, ClipboardList, "/purchases/purchase-orders/new", PERMISSIONS.purchaseOrders.create, "purchaseOrders", partyId),
    action("supplier-credit", "Supplier Credit", partyType, RotateCcw, "/purchases/debit-notes/new", PERMISSIONS.purchaseDebitNotes.create, "purchaseDebitNotes", partyId),
    disabledAction("pay-down-credit-card", "Pay down credit card", partyType, CreditCard, PERMISSIONS.bankTransfers.create, "creditCardPayments", "Credit card paydown is not enabled yet."),
    disabledAction("import-bills", "Import Bills", partyType, FileInput, PERMISSIONS.purchaseBills.create, "importBills", "Bill import is not enabled yet."),
    action("item-receipt", "Item Receipt", partyType, PackageCheck, "/inventory/purchase-receipts/new", PERMISSIONS.purchaseReceiving.create, "purchaseReceiving", partyId, { sourceType: "standalone" }),
    disabledAction("time-activity", "Time Activity", partyType, ClipboardList, PERMISSIONS.users.view, "timeActivities", "Time activity is not enabled yet."),
    action("bill-payment", "Bill Payment / Pay Bills", partyType, WalletCards, "/purchases/supplier-payments/new", PERMISSIONS.supplierPayments.create, "supplierPayments", partyId),
  ];
}

function action(
  id: string,
  label: string,
  partyType: PartyKind,
  icon: LucideIcon,
  basePath: string,
  requiredPermission: Permission,
  requiredModule: PartyNewTransactionModule,
  partyId: string,
  extraParams?: Record<string, string>,
): PartyTransactionAction {
  return {
    id,
    label,
    partyType,
    icon,
    href: buildPartyTransactionHref(basePath, partyType, partyId, extraParams),
    requiredPermission,
    requiredModule,
  };
}

function disabledAction(
  id: string,
  label: string,
  partyType: PartyKind,
  icon: LucideIcon,
  requiredPermission: Permission,
  requiredModule: PartyNewTransactionModule,
  disabledReason: string,
): PartyTransactionAction {
  return {
    id,
    label,
    partyType,
    icon,
    requiredPermission,
    requiredModule,
    disabledReason,
  };
}
