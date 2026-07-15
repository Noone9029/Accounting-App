"use client";

import {
  Archive,
  BarChart3,
  Calculator,
  ChevronDown,
  FileText,
  Landmark,
  Menu,
  Package,
  Receipt,
  Settings2,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { getLedgerByteEdition } from "@/lib/edition";
import { filterSidebarNavItems, type SidebarNavChild, type SidebarNavItem } from "@/lib/sidebar-nav";
import { canViewNavItem, PERMISSIONS, type Permission } from "@/lib/permissions";
import { GlobalCreateMenu } from "./global-create-menu";

const iconsByHref: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/dashboard": BarChart3,
  "/customers": Users,
  "/suppliers": Users,
  "/sales/invoices": Receipt,
  "/purchases/bills": ShoppingCart,
  "/bank-accounts": Landmark,
  "/journal-entries": FileText,
  "/fixed-assets": Package,
  "/inventory/balances": Package,
  "/tax": Calculator,
  "/reports": BarChart3,
  "/documents": Archive,
  "/settings/compliance": Calculator,
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
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const { dir, t, tc } = useAppLocale();
  const edition = getLedgerByteEdition();
  const visibleItems = useMemo(() => filterSidebarNavItems(activeMembership), [activeMembership]);
  const activeCategoryHref = useMemo(() => activeExpandableHref(visibleItems, pathname), [pathname, visibleItems]);
  const [openCategoryHref, setOpenCategoryHref] = useState<string | null>(() => activeCategoryHref);

  useEffect(() => {
    setOpenCategoryHref(activeCategoryHref);
  }, [activeCategoryHref]);

  return (
    <aside className={`flex h-screen w-72 shrink-0 flex-col border-slate-950 bg-sidebar text-slate-100 ${dir === "rtl" ? "border-l" : "border-r"}`}>
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="ledger-focus block rounded-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-sm font-bold text-sidebar">LB</div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">LedgerByte</div>
              <div className="mt-0.5 text-xs text-slate-300">{tc(edition.brandSubline)}</div>
            </div>
          </div>
        </Link>
        <div className="mt-4 inline-flex items-center rounded-md border border-blue-300/30 bg-blue-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100">
          {t("common.controlledBeta")}
        </div>
      </div>
      <div className="border-b border-white/10 px-3 py-3">
        <GlobalCreateMenu />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t("nav.aria")}>
        <div className="space-y-3">
          {visibleItems.map((item, itemIndex) => {
            const section = sidebarSectionLabel(item.label);
            const previousItem = visibleItems[itemIndex - 1];
            const showSection = !previousItem || sidebarSectionLabel(previousItem.label) !== section;
            const isExpanded = openCategoryHref === item.href;
            return (
              <div key={item.href}>
                {showSection ? <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tc(section)}</div> : null}
                <SidebarNavItemRow
                  item={item}
                  pathname={pathname}
                  expanded={isExpanded}
                  onToggle={() => setOpenCategoryHref((currentHref) => (currentHref === item.href ? null : item.href))}
                />
              </div>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-slate-400">
        {tc(edition.shellFooter)}
      </div>
    </aside>
  );
}

function SidebarNavItemRow({
  item,
  pathname,
  expanded,
  onToggle,
  onNavigate,
  mobile = false,
}: {
  item: SidebarNavItem;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { dir, tc } = useAppLocale();
  const Icon = iconsByHref[item.href];
  const children = expandableChildren(item);
  const hasChildren = children.length > 0;
  const active = isItemActive(item, pathname);
  const panelId = navPanelId(item.href, mobile ? "mobile" : "desktop");

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`ledger-focus flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active ? "bg-blue-400/15 text-white ring-1 ring-blue-300/20" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        <span>{tc(item.label)}</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className={`ledger-focus flex min-h-9 w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm font-medium transition-colors ${
          active || expanded ? "bg-blue-400/15 text-white ring-1 ring-blue-300/20" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        <span className="min-w-0 flex-1">{tc(item.label)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {expanded ? (
        <div id={panelId} className={`mb-2 mt-1 space-y-1 border-white/10 ${dir === "rtl" ? "mr-7 border-r pr-3" : "ml-7 border-l pl-3"}`}>
          {children.map((child, index) => {
            const childActive = isHrefActive(pathname, child.href);
            return (
              <div key={`${child.group ?? "default"}-${child.href}-${child.label}`}>
                {child.group && child.group !== children[index - 1]?.group ? (
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tc(child.group)}</div>
                ) : null}
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={`ledger-focus block rounded-md px-2 py-1.5 text-xs transition-colors ${
                    childActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {tc(child.label)}
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function expandableChildren(item: SidebarNavItem): readonly SidebarNavChild[] {
  const children = item.children ?? [];
  if (children.length === 0 || children.some((child) => child.href === item.href)) {
    return children;
  }

  return [{ label: `${item.label} overview`, href: item.href, requiredAny: item.requiredAny ?? [] }, ...children];
}

function activeExpandableHref(items: readonly SidebarNavItem[], pathname: string): string | null {
  return items.find((item) => expandableChildren(item).length > 0 && isItemActive(item, pathname))?.href ?? null;
}

function isItemActive(item: SidebarNavItem, pathname: string): boolean {
  const activeBase = item.activePrefix ?? item.href;
  return isHrefActive(pathname, item.href) || pathname.startsWith(`${activeBase}/`) || expandableChildren(item).some((child) => isHrefActive(pathname, child.href));
}

function isHrefActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navPanelId(href: string, scope: "desktop" | "mobile"): string {
  return `${scope}-sidebar-panel-${href.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function sidebarSectionLabel(label: string): string {
  if (label === "Dashboard") return "Overview";
  if (label === "Customers" || label === "Suppliers" || label === "Sales" || label === "Purchases") return "Daily books";
  if (label === "Banking" || label === "Accounting" || label === "Inventory") return "Operations";
  if (label === "Documents" || label === "Compliance" || label === "Reports") return "Review";
  return "Administration";
}

export function MobileWorkflowNav() {
  const pathname = usePathname();
  const { activeMembership } = usePermissions();
  const { dir, t, tc } = useAppLocale();
  const [open, setOpen] = useState(false);
  const navigationTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const visibleLinks = mobileWorkflowLinks.filter((item) => canViewNavItem(activeMembership, item.requiredAny));
  const visibleItems = useMemo(() => filterSidebarNavItems(activeMembership), [activeMembership]);
  const activeCategoryHref = useMemo(() => activeExpandableHref(visibleItems, pathname), [pathname, visibleItems]);
  const [openCategoryHref, setOpenCategoryHref] = useState<string | null>(() => activeCategoryHref);

  useEffect(() => {
    if (!open) return;

    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => drawerRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const animationFrame = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        navigationTriggerRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = drawerRef.current ? [...drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)] : [];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    navigationTriggerRef.current?.focus();
  }

  useEffect(() => {
    setOpenCategoryHref(activeCategoryHref);
  }, [activeCategoryHref]);

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <>
      <nav className="border-b border-line bg-white px-4 py-2 lg:hidden" aria-label={t("mobile.firstWorkflow")}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("mobile.openNavigation")}
            ref={navigationTriggerRef}
            onClick={() => setOpen(true)}
            className="ledger-focus inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleLinks.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ledger-focus whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold ${
                    active
                      ? "border-accent bg-blue-50 text-accent"
                      : "border-line bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {tc(item.label)}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={t("mobile.closeOverlay")} className="absolute inset-0 bg-slate-950/40" onClick={closeDrawer} />
          <div ref={drawerRef} role="dialog" aria-label={t("mobile.workspaceDrawer")} aria-modal="true" className={`absolute inset-y-0 flex w-[min(22rem,88vw)] flex-col bg-sidebar text-slate-100 shadow-2xl ${dir === "rtl" ? "right-0" : "left-0"}`}>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white">LedgerByte</div>
                <div className="mt-0.5 text-xs text-slate-300">{t("common.controlledBeta")}</div>
              </div>
              <button type="button" aria-label={t("mobile.closeNavigation")} onClick={closeDrawer} className="ledger-focus rounded-md border border-white/10 p-2 text-slate-200">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-4">
              {visibleItems.map((item) => (
                <div key={item.href} className="mb-2">
                  <SidebarNavItemRow
                    item={item}
                    pathname={pathname}
                    expanded={openCategoryHref === item.href}
                    onToggle={() => setOpenCategoryHref((currentHref) => (currentHref === item.href ? null : item.href))}
                    onNavigate={() => setOpen(false)}
                    mobile
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
