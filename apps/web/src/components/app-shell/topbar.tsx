"use client";

import Link from "next/link";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PERMISSIONS } from "@/lib/permissions";
import { GlobalCreateMenu } from "./global-create-menu";
import { GlobalSearch } from "./global-search";
import { OrganizationSwitcher } from "./organization-switcher";

export function Topbar() {
  const { activeMembership, can } = usePermissions();

  return (
    <header className="flex min-h-16 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="min-w-0 lg:w-52">
        <div className="text-sm font-semibold text-ink">Accounting workspace</div>
        <div className="text-xs text-steel">Local development shell</div>
      </div>
      <GlobalSearch className="w-full lg:min-w-[22rem] lg:flex-1 lg:max-w-2xl" />
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end lg:gap-3">
        <GlobalCreateMenu className="lg:hidden" placement="topbar" />
        <OrganizationSwitcher />
        {!activeMembership || can(PERMISSIONS.organization.update) ? (
          <Link href="/organization/setup" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Organization setup
          </Link>
        ) : null}
        {can(PERMISSIONS.journals.create) ? (
          <Link href="/journal-entries/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New journal
          </Link>
        ) : null}
      </div>
    </header>
  );
}
