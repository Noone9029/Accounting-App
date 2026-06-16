"use client";

import Link from "next/link";
import { useMemo } from "react";
import { clearSession, getAccessToken, setActiveOrganizationId } from "@/lib/api";
import { usePermissions } from "@/components/permissions/permission-provider";

export function OrganizationSwitcher() {
  const { activeMembership, error, loading, user } = usePermissions();
  const organizations = useMemo(() => user?.memberships.map((membership) => membership.organization) ?? [], [user]);
  const activeId = activeMembership?.organization.id ?? "";

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeId),
    [organizations, activeId],
  );

  if (loading) {
    return <div className="text-xs text-steel">Loading organization...</div>;
  }

  if (!getAccessToken()) {
    return (
      <Link href="/login" className="ledger-focus rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Log in
      </Link>
    );
  }

  if (error) {
    return <div className="max-w-72 truncate text-xs text-rosewood">{error}</div>;
  }

  if (organizations.length === 0) {
    return (
      <Link href="/organization/setup" className="ledger-focus rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Create organization
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <label className="flex min-w-0 flex-col gap-1 text-xs text-steel sm:flex-row sm:items-center sm:gap-2">
        <span>Organization</span>
        <select
          value={activeId}
          onChange={(event) => {
            setActiveOrganizationId(event.target.value);
          }}
          className="w-full min-w-0 rounded-md border border-line bg-white px-2 py-2 text-sm font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 sm:min-w-48"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <div className="hidden max-w-44 truncate text-xs text-steel lg:block">
        {activeOrganization?.baseCurrency} · {activeOrganization?.countryCode}
      </div>
      <button
        type="button"
        onClick={() => {
          clearSession();
          window.location.href = "/login";
        }}
        className="ledger-focus rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  );
}
