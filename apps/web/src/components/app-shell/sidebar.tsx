"use client";

import {
  Archive,
  BarChart3,
  Calculator,
  FileText,
  Landmark,
  Menu,
  Package,
  Receipt,
  Settings2,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePermissions } from "@/components/permissions/permission-provider";
import { filterSidebarNavItems } from "@/lib/sidebar-nav";
import { canViewNavItem, PERMISSIONS, type Permission } from "@/lib/permissions";
import { GlobalCreateMenu } from "./global-create-menu";

const iconsByHref: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/dashboard": BarChart3,
  "/sales/invoices": Receipt,
  "/purchases/bills": ShoppingCart,
  "/bank-accounts": Landmark,
  "/journal-entries": FileText,
  "/inventory/balances": Package,
  "/tax": Calculator,
  "/reports": BarChart3,
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
  { label: "Customer", href: "/customers", requiredAny: [PERMISSIONS.contacts.view] },
  { label: "Supplier", href: "/suppliers", requiredAny: [PERMISSIONS.contacts.view] },
  { label: "Invoice", href: "/sales/invoices/new", requiredAny: [PERMISSIONS.salesInvoices.create] },
  { label: "Payment", href: "/sales/customer-payments/new", requiredAny: [PERMISSIONS.customerPayments.create] },
  { label: "Tax", href: "/tax", requiredAny: [PERMISSIONS.reports.view] },
  { label: "Reports", href: "/reports", requiredAny: [PERMISSIONS.reports.view] },
];

export function Sidebar() {
  return <SidebarContent />;
}

function SidebarContent({ compact = false }: Readonly<{ compact?: boolean }>) {
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const visibleItems = filterSidebarNavItems(activeMembership);

  return (
    <aside className={`${compact ? "h-full w-full" : "h-screen w-72"} flex shrink-0 flex-col bg-[#061a2f] text-white`}>
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-sky-500/15 text-sm font-bold text-sky-200 ring-1 ring-sky-300/20">
            LB
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">LedgerByte</div>
            <div className="mt-0.5 truncate text-xs text-slate-300">Saudi-first accounting workspace</div>
          </div>
        </div>
      </div>
      <div className="border-b border-white/10 px-3 py-3">
        <GlobalCreateMenu />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="px-3 py-4" aria-label="Main navigation">
          <div className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const Icon = iconsByHref[item.href];
            const activeBase = item.activePrefix ?? item.href;
            const active = pathname === item.href || pathname.startsWith(`${activeBase}/`);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-sky-500/18 text-white ring-1 ring-sky-300/20" : "text-slate-300 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                  <span>{item.label}</span>
                </Link>
                {item.children && item.children.length > 0 ? (
                  <div className="mb-2 ml-5 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                    {item.children.map((child, index) => (
                      <div key={child.href}>
                        {child.group && child.group !== item.children?.[index - 1]?.group ? (
                          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase text-slate-500">{child.group}</div>
                        ) : null}
                        <Link
                          href={child.href}
                          className={`block rounded-md px-2 py-1.5 text-xs transition ${
                            pathname === child.href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/7 hover:text-white"
                          }`}
                        >
                          {child.label}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>
        </nav>
      </ScrollArea>
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
    <nav className="border-b border-border bg-card px-4 py-2 lg:hidden" aria-label="First workflow navigation">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open navigation" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-[20rem] max-w-[86vw] border-0 bg-[#061a2f] p-0 text-white" showCloseButton={false}>
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent compact />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {visibleLinks.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
