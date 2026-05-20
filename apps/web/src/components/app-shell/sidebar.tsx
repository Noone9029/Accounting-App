"use client";

import {
  Archive,
  BarChart3,
  Building2,
  FileText,
  Package,
  Receipt,
  Settings2,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { filterSidebarNavItems } from "@/lib/sidebar-nav";
import { canViewNavItem, PERMISSIONS, type Permission } from "@/lib/permissions";

const iconsByHref: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/dashboard": BarChart3,
  "/reports": BarChart3,
  "/sales/invoices": Receipt,
  "/purchases/bills": ShoppingCart,
  "/contacts": Users,
  "/items": Package,
  "/journal-entries": FileText,
  "/branches": Building2,
  "/documents": Archive,
  "/settings/team": Settings2,
};

const mobileWorkflowLinks: readonly {
  label: string;
  href: string;
  requiredAny: readonly Permission[];
}[] = [
  { label: "Dashboard", href: "/dashboard", requiredAny: [PERMISSIONS.dashboard.view] },
  { label: "Setup", href: "/setup", requiredAny: [PERMISSIONS.dashboard.view] },
  { label: "Customer", href: "/contacts", requiredAny: [PERMISSIONS.contacts.view] },
  { label: "Invoice", href: "/sales/invoices/new", requiredAny: [PERMISSIONS.salesInvoices.create] },
  { label: "Payment", href: "/sales/customer-payments/new", requiredAny: [PERMISSIONS.customerPayments.create] },
  { label: "Reports", href: "/reports", requiredAny: [PERMISSIONS.reports.view] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const visibleItems = filterSidebarNavItems(activeMembership);

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-palm">LedgerByte</div>
        <div className="mt-1 text-xs text-steel">Saudi-first accounting workspace</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = iconsByHref[item.href];
            const activeBase = item.activePrefix ?? item.href;
            const active = pathname === item.href || pathname.startsWith(`${activeBase}/`);
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
                {item.children && item.children.length > 0 ? (
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

export function MobileWorkflowNav() {
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const visibleLinks = mobileWorkflowLinks.filter((item) => canViewNavItem(activeMembership, item.requiredAny));

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <nav className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden" aria-label="First workflow navigation">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {visibleLinks.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold ${
                active
                  ? "border-palm bg-emerald-50 text-palm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
