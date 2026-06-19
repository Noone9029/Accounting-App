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
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePermissions } from "@/components/permissions/permission-provider";
import { getLedgerByteEdition } from "@/lib/edition";
import { filterSidebarNavItems } from "@/lib/sidebar-nav";
import { getMobileShellRoutes } from "@/lib/app-routes";
import { canViewNavItem } from "@/lib/permissions";
import { GlobalCreateMenu } from "./global-create-menu";

const iconsByHref: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/dashboard": BarChart3,
  "/customers": Users,
  "/suppliers": Users,
  "/sales/invoices": Receipt,
  "/purchases/bills": ShoppingCart,
  "/bank-accounts": Landmark,
  "/journal-entries": FileText,
  "/inventory/balances": Package,
  "/tax": Calculator,
  "/reports": BarChart3,
  "/documents": Archive,
  "/settings/compliance": Calculator,
  "/settings/team": Settings2,
};

export function Sidebar() {
  return <SidebarContent />;
}

function SidebarContent({ compact = false }: Readonly<{ compact?: boolean }>) {
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const edition = getLedgerByteEdition();
  const visibleItems = filterSidebarNavItems(activeMembership);

  return (
    <aside className={`${compact ? "h-full w-full" : "h-screen w-72"} flex shrink-0 flex-col bg-sidebar text-slate-100`}>
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="ledger-focus block rounded-md">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-white text-sm font-bold text-sidebar">
              LB
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">LedgerByte</div>
              <div className="mt-0.5 truncate text-xs text-slate-300">{edition.brandSubline}</div>
            </div>
          </div>
        </Link>
        <div className="mt-4 inline-flex items-center rounded-md border border-blue-300/30 bg-blue-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100">
          Controlled beta
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
            const childActive = Boolean(item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)));
            const active = pathname === item.href || pathname.startsWith(`${activeBase}/`) || childActive;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`ledger-focus flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-blue-400/15 text-white ring-1 ring-blue-300/20" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                  <span>{item.label}</span>
                </Link>
                {item.children && item.children.length > 0 ? (
                  <div className="mb-2 ml-5 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                    {item.children.map((child, index) => (
                      <div key={`${child.href}-${child.label}`}>
                        {child.group && child.group !== item.children?.[index - 1]?.group ? (
                          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{child.group}</div>
                        ) : null}
                        <Link
                          href={child.href}
                          className={`ledger-focus block rounded-md px-2 py-1.5 text-xs transition-colors ${
                            pathname === child.href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/[0.08] hover:text-white"
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
      <div className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-slate-400">
        {edition.shellFooter}
      </div>
    </aside>
  );
}

export function MobileWorkflowNav() {
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const visibleLinks = getMobileShellRoutes().filter((item) => canViewNavItem(activeMembership, item.requiredAny));

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <nav className="border-b border-line bg-white px-4 py-2 lg:hidden" aria-label="First workflow navigation">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open navigation" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-[20rem] max-w-[86vw] border-0 bg-sidebar p-0 text-white" showCloseButton={false}>
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
                  ? "border-accent bg-blue-50 text-accent"
                  : "border-line bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item.mobileLabel ?? item.label}
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
