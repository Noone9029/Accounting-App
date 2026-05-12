"use client";

import {
  BarChart3,
  Archive,
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Inbox,
  Landmark,
  LayoutDashboard,
  Package,
  Plug,
  Receipt,
  Settings2,
  ShoppingCart,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  label: string;
  href: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children?: Array<{ label: string; href: string }>;
}

const navItems: NavItem[] = [
  { label: "Get started", href: "/get-started", icon: BookOpen },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    children: [
      { label: "General Ledger", href: "/reports/general-ledger" },
      { label: "Trial Balance", href: "/reports/trial-balance" },
      { label: "Profit & Loss", href: "/reports/profit-and-loss" },
      { label: "Balance Sheet", href: "/reports/balance-sheet" },
      { label: "VAT Summary", href: "/reports/vat-summary" },
      { label: "Aged Receivables", href: "/reports/aged-receivables" },
      { label: "Aged Payables", href: "/reports/aged-payables" },
    ],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: Receipt,
    children: [
      { label: "Quotes & Proformas", href: "/sales/quotes" },
      { label: "Invoices", href: "/sales/invoices" },
      { label: "Customer payments", href: "/sales/customer-payments" },
      { label: "Customer refunds", href: "/sales/customer-refunds" },
      { label: "Recurring invoices", href: "/sales/recurring-invoices" },
      { label: "Credit notes", href: "/sales/credit-notes" },
      { label: "Cash invoices", href: "/sales/cash-invoices" },
      { label: "Delivery notes", href: "/sales/delivery-notes" },
      { label: "API invoices", href: "/sales/api-invoices" },
    ],
  },
  {
    label: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    children: [
      { label: "Bills", href: "/purchases/bills" },
      { label: "Supplier payments", href: "/purchases/supplier-payments" },
      { label: "Supplier refunds", href: "/purchases/supplier-refunds" },
      { label: "Cash expenses", href: "/purchases/cash-expenses" },
      { label: "Debit notes", href: "/purchases/debit-notes" },
      { label: "Purchase orders", href: "/purchases/purchase-orders" },
    ],
  },
  {
    label: "Customers & suppliers",
    href: "/contacts",
    icon: Users,
    children: [
      { label: "Contacts", href: "/contacts" },
      { label: "Beneficiaries", href: "/beneficiaries" },
    ],
  },
  { label: "Payroll & Employees", href: "/payroll", icon: WalletCards },
  {
    label: "Products & Services",
    href: "/products",
    icon: Package,
    children: [{ label: "Items", href: "/items" }],
  },
  {
    label: "For accountants",
    href: "/accounting",
    icon: FileText,
    children: [
      { label: "Manual journals", href: "/journal-entries" },
      { label: "Chart of accounts", href: "/accounts" },
      { label: "Tax rates", href: "/tax-rates" },
      { label: "Fiscal periods", href: "/fiscal-periods" },
    ],
  },
  { label: "Bank accounts", href: "/bank-accounts", icon: Landmark },
  { label: "Fixed assets", href: "/fixed-assets", icon: CreditCard },
  { label: "Cost Centers", href: "/cost-centers", icon: FolderKanban },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Branches", href: "/branches", icon: Building2 },
  {
    label: "Developer",
    href: "/developer",
    icon: Plug,
    children: [{ label: "API keys", href: "/developer/api-keys" }],
  },
  { label: "Integrations", href: "/integrations", icon: Settings2 },
  { label: "Documents / Archive", href: "/documents", icon: Archive },
  {
    label: "Document templates",
    href: "/settings/documents",
    icon: FileText,
    children: [
      { label: "Document settings", href: "/settings/documents" },
      { label: "ZATCA", href: "/settings/zatca" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-palm">LedgerByte</div>
        <div className="mt-1 text-xs text-steel">Saudi-first accounting workspace</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    active ? "bg-mist text-ink" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                  <span>{item.label}</span>
                </Link>
                {item.children ? (
                  <div className="mb-2 ml-7 mt-1 space-y-1 border-l border-slate-200 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded-md px-2 py-1.5 text-xs ${
                          pathname === child.href ? "bg-mist text-ink" : "text-slate-500 hover:bg-slate-50 hover:text-ink"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
