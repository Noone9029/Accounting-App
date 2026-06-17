"use client";

import { Bell, CircleHelp, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { usePermissions } from "@/components/permissions/permission-provider";
import { getLedgerByteEdition } from "@/lib/edition";
import { PERMISSIONS } from "@/lib/permissions";
import { GlobalCreateMenu } from "./global-create-menu";
import { GlobalSearch } from "./global-search";
import { OrganizationSwitcher } from "./organization-switcher";

export function Topbar() {
  const { activeMembership, can } = usePermissions();
  const edition = getLedgerByteEdition();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-col gap-3 border-b border-line bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="min-w-0 lg:w-60">
        <div className="text-sm font-semibold text-ink">Accounting workspace</div>
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
      <GlobalSearch className="w-full lg:min-w-[22rem] lg:flex-1 lg:max-w-2xl" />
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end lg:gap-3">
        <GlobalCreateMenu className="lg:hidden" placement="topbar" />
        <OrganizationSwitcher />
        {!activeMembership || can(PERMISSIONS.organization.update) ? (
          <Link href="/organization/setup" className={buttonVariants({ variant: "outline" })}>
            Organization setup
          </Link>
        ) : null}
        {can(PERMISSIONS.journals.create) ? (
          <Link href="/journal-entries/new" className={buttonVariants()}>
            New journal
          </Link>
        ) : null}
        <IconButton label="Notifications" icon={Bell} />
        <IconButton label="Help" icon={CircleHelp} />
        <IconButton label="Account menu" icon={UserRound} />
      </div>
    </header>
  );
}

function IconButton({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="ledger-focus hidden h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-steel transition hover:border-accent/40 hover:text-ink sm:inline-flex"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
