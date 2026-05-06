import Link from "next/link";
import { OrganizationSwitcher } from "./organization-switcher";

export function Topbar() {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <div className="text-sm font-semibold text-ink">Accounting workspace</div>
        <div className="text-xs text-steel">Local development shell</div>
      </div>
      <div className="flex items-center gap-3">
        <OrganizationSwitcher />
        <Link href="/organization/setup" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Organization setup
        </Link>
        <Link href="/journal-entries/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          New journal
        </Link>
      </div>
    </header>
  );
}
