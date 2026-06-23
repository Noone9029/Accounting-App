"use client";

import { AlertTriangle, Bell, CircleHelp, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { usePermissions } from "@/components/permissions/permission-provider";
import { apiRequest } from "@/lib/api";
import { getLedgerByteEdition } from "@/lib/edition";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { DashboardAttentionItem, DashboardSummary } from "@/lib/types";
import { GlobalCreateMenu } from "./global-create-menu";
import { GlobalSearch } from "./global-search";
import { AccountMenuContent } from "./organization-switcher";

type TopbarMenu = "notifications" | "help" | "account";

type NotificationState =
  | { status: "idle"; items: DashboardAttentionItem[] }
  | { status: "loading"; items: DashboardAttentionItem[] }
  | { status: "ready"; items: DashboardAttentionItem[] }
  | { status: "error"; items: DashboardAttentionItem[]; message: string };

export function Topbar() {
  const { activeMembership, can } = usePermissions();
  const edition = getLedgerByteEdition();
  const pathname = usePathname();
  const context = topbarContext(pathname);
  const [openMenu, setOpenMenu] = useState<TopbarMenu | null>(null);
  const [notifications, setNotifications] = useState<NotificationState>({ status: "idle", items: [] });
  const actionsRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setOpenMenu(null);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (openMenu !== "notifications" || !activeMembership || notifications.status === "loading" || notifications.status === "ready") {
      return;
    }

    let cancelled = false;
    setNotifications((current) => ({ status: "loading", items: current.items }));
    apiRequest<Pick<DashboardSummary, "attentionItems">>("/dashboard/summary")
      .then((summary) => {
        if (!cancelled) {
          setNotifications({ status: "ready", items: summary.attentionItems ?? [] });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setNotifications({
            status: "error",
            items: [],
            message: error instanceof Error ? error.message : "Unable to load notifications.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeMembership, openMenu]);

  const toggleMenu = (menu: TopbarMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-col gap-3 border-b border-line bg-panel/95 px-4 py-3 shadow-sm backdrop-blur lg:px-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 xl:w-64">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-ink">{context.title}</div>
          <span className="rounded-md border border-line bg-mist px-1.5 py-0.5 text-[11px] font-semibold uppercase text-steel">{context.group}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-steel">
          <span>{edition.topbarSubtitle}</span>
          {edition.showUaeEinvoicing ? (
            <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">No FTA reporting yet</span>
          ) : null}
          {edition.showZatca ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">ZATCA network disabled</span>
          ) : null}
        </div>
      </div>
      <GlobalSearch className="w-full xl:min-w-[22rem] xl:flex-1 xl:max-w-2xl" />
      <div ref={actionsRef} className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end xl:gap-3">
        <GlobalCreateMenu className="lg:hidden" placement="topbar" />
        {can(PERMISSIONS.journals.create) ? (
          <Link href="/journal-entries/new" className={buttonVariants()}>
            New journal
          </Link>
        ) : null}
        <TopbarAction label="Notifications" icon={Bell} open={openMenu === "notifications"} onClick={() => toggleMenu("notifications")}>
          <NotificationsMenu active={Boolean(activeMembership)} state={notifications} onAction={closeMenu} />
        </TopbarAction>
        <TopbarAction label="Help" icon={CircleHelp} open={openMenu === "help"} onClick={() => toggleMenu("help")}>
          <HelpMenu context={context} pathname={pathname} can={can} onAction={closeMenu} />
        </TopbarAction>
        <TopbarAction label="Account menu" icon={UserRound} open={openMenu === "account"} onClick={() => toggleMenu("account")}>
          <AccountMenuContent onAction={closeMenu} />
        </TopbarAction>
      </div>
    </header>
  );
}

function TopbarAction({
  children,
  icon: Icon,
  label,
  onClick,
  open,
}: {
  children: ReactNode;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  open: boolean;
}) {
  const dialogId = `topbar-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="relative">
      <IconButton label={label} icon={Icon} open={open} controls={dialogId} onClick={onClick} />
      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-line bg-white p-4 text-left shadow-lift"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  controls,
  label,
  icon: Icon,
  onClick,
  open,
}: {
  controls: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  open: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={controls}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onClick}
      className={`ledger-focus inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white transition-colors ${
        open ? "border-accent/50 text-ink shadow-panel" : "border-line text-steel hover:border-accent/40 hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function NotificationsMenu({
  active,
  onAction,
  state,
}: {
  active: boolean;
  onAction: () => void;
  state: NotificationState;
}) {
  return (
    <div>
      <PopoverHeader
        title="Notifications"
        description="Operational attention items from the current dashboard data."
      />
      {!active ? (
        <PopoverEmpty title="No organization selected" description="Log in and select an organization to load notifications." />
      ) : state.status === "loading" ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-steel">Loading notifications...</div>
      ) : state.status === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-rosewood">{state.message}</div>
      ) : state.items.length === 0 ? (
        <PopoverEmpty title="No attention items" description="No dashboard alerts were generated from current data." />
      ) : (
        <div className="space-y-2">
          {state.items.map((item) => (
            <Link
              key={`${item.type}-${item.href}`}
              href={item.href}
              onClick={onAction}
              className={`ledger-focus block rounded-md border px-3 py-3 text-sm transition hover:shadow-sm ${notificationSeverityClass(item.severity)}`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase">{notificationSeverityLabel(item.severity)}</div>
                  <div className="mt-1 font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs leading-5">{item.description}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Link href="/dashboard" onClick={onAction} className="ledger-focus mt-3 block rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Open dashboard
      </Link>
    </div>
  );
}

function HelpMenu({
  can,
  context,
  onAction,
  pathname,
}: {
  can: (permission: Permission) => boolean;
  context: { title: string; group: string };
  onAction: () => void;
  pathname: string;
}) {
  const links = [
    { label: "Current workspace", detail: context.title, href: pathname, visible: true },
    { label: "Dashboard", detail: "Business overview and attention items", href: "/dashboard", visible: can(PERMISSIONS.dashboard.view) },
    { label: "Guided setup", detail: "First-workflow setup checklist", href: "/setup", visible: can(PERMISSIONS.dashboard.view) },
    { label: "Document archive", detail: "Generated PDF outputs", href: "/documents", visible: can(PERMISSIONS.generatedDocuments.view) || can(PERMISSIONS.documents.view) },
    { label: "Organization settings", detail: "Legal profile, country, and currency", href: "/organization/setup", visible: true },
    { label: "Audit logs", detail: "Review high-risk activity", href: "/settings/audit-logs", visible: can(PERMISSIONS.auditLogs.view) },
  ].filter((link) => link.visible);

  return (
    <div>
      <PopoverHeader
        title="Help"
        description="Links to existing beta resources and setup areas. No live support chat is connected."
      />
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            aria-label={link.label === "Current workspace" ? `${link.label} ${link.detail}` : link.label}
            onClick={onAction}
            className="ledger-focus block rounded-md border border-line px-3 py-2 text-sm hover:bg-slate-50"
          >
            <span className="font-semibold text-ink">
              {link.label} {link.label === "Current workspace" ? link.detail : ""}
            </span>
            {link.label !== "Current workspace" ? <span className="mt-0.5 block text-xs leading-5 text-steel">{link.detail}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PopoverHeader({ description, title }: { description: string; title: string }) {
  return (
    <div className="mb-3 border-b border-slate-200 pb-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-steel">{description}</p>
    </div>
  );
}

function PopoverEmpty({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-xs leading-5">{description}</p>
    </div>
  );
}

function notificationSeverityLabel(severity: DashboardAttentionItem["severity"]): string {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  return "Info";
}

function notificationSeverityClass(severity: DashboardAttentionItem["severity"]): string {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-900";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function topbarContext(pathname: string): { title: string; group: string } {
  if (pathname.startsWith("/sales")) return { title: "Sales workflow", group: "AR" };
  if (pathname.startsWith("/purchases")) return { title: "Purchases workflow", group: "AP" };
  if (pathname.startsWith("/bank-accounts") || pathname.startsWith("/bank-transfers") || pathname.startsWith("/bank-reconciliations") || pathname.startsWith("/bank-statement-transactions")) {
    return { title: "Manual banking", group: "Review" };
  }
  if (pathname.startsWith("/reports")) return { title: "Reports workspace", group: "Review" };
  if (pathname.startsWith("/inventory") || pathname.startsWith("/items")) return { title: "Inventory operations", group: "Stock" };
  if (pathname.startsWith("/settings") || pathname.startsWith("/organization") || pathname.startsWith("/branches")) return { title: "Administration", group: "Controls" };
  if (pathname.startsWith("/setup")) return { title: "Guided setup", group: "Onboarding" };
  if (pathname.startsWith("/documents")) return { title: "Document archive", group: "Evidence" };
  if (pathname.startsWith("/customers") || pathname.startsWith("/suppliers") || pathname.startsWith("/contacts")) return { title: "Party workspace", group: "Ledger" };
  return { title: "Accounting workspace", group: "Beta" };
}
