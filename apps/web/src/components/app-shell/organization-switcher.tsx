"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { logoutSession, setActiveOrganizationId } from "@/lib/api";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PERMISSIONS } from "@/lib/permissions";

interface AccountMenuContentProps {
  onAction?: () => void;
}

export function AccountMenuContent({ onAction }: AccountMenuContentProps) {
  const router = useRouter();
  const { activeMembership, can, error, loading, user } = usePermissions();
  const { t } = useAppLocale();
  const organizations = useMemo(() => user?.memberships.map((membership) => membership.organization) ?? [], [user]);
  const activeId = activeMembership?.organization.id ?? "";

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeId),
    [organizations, activeId],
  );

  if (loading) {
    return <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-steel">{t("account.loading")}</div>;
  }

  if (!user) {
    return (
      <Link href="/login" onClick={onAction} className="ledger-focus block rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {t("account.login")}
      </Link>
    );
  }

  if (error) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-rosewood">{error}</div>;
  }

  if (organizations.length === 0) {
    return (
      <Link href="/organization/setup" onClick={onAction} className="ledger-focus block rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {t("account.createOrganization")}
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="text-sm font-semibold text-ink">{user?.name || user?.email}</div>
        <div className="mt-0.5 truncate text-xs text-steel">{user?.email}</div>
        <div className="mt-2 text-xs text-steel">
          {activeMembership?.role.name ? <span>{activeMembership.role.name}</span> : null}
          {activeOrganization ? <span> · {activeOrganization.baseCurrency} · {activeOrganization.countryCode}</span> : null}
        </div>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
        <span>{t("account.activeOrganization")}</span>
        <select
          value={activeId}
          onChange={(event) => {
            setActiveOrganizationId(event.target.value);
          }}
          className="mt-1 w-full rounded-md border border-line bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2">
        <Link
          href="/organization/setup"
          onClick={onAction}
          className="ledger-focus rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("account.organizationSettings")}
        </Link>
        {can(PERMISSIONS.users.view) ? (
          <Link
            href="/settings/team"
            onClick={onAction}
            className="ledger-focus rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("account.usersAndRoles")}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => {
          void logoutSession().finally(() => {
            onAction?.();
            router.replace("/login");
          });
        }}
        className="ledger-focus w-full rounded-md border border-line px-3 py-2 text-start text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t("account.signOut")}
      </button>
    </div>
  );
}

export function OrganizationSwitcher() {
  return <AccountMenuContent />;
}
