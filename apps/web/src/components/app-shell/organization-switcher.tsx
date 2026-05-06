"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession, getAccessToken, getActiveOrganizationId, setActiveOrganizationId } from "@/lib/api";
import type { MeResponse, Organization } from "@/lib/types";

export function OrganizationSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiRequest<MeResponse>("/auth/me", { organizationId: null });
        if (cancelled) {
          return;
        }

        const activeOrganizations = me.memberships
          .filter((membership) => membership.status === "ACTIVE")
          .map((membership) => membership.organization);
        setOrganizations(activeOrganizations);

        const storedOrganizationId = getActiveOrganizationId();
        const nextActiveId =
          activeOrganizations.find((organization) => organization.id === storedOrganizationId)?.id ??
          activeOrganizations[0]?.id ??
          "";

        setActiveId(nextActiveId);
        if (nextActiveId) {
          setActiveOrganizationId(nextActiveId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load organizations.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeId),
    [organizations, activeId],
  );

  if (loading) {
    return <div className="text-xs text-steel">Loading organization...</div>;
  }

  if (!getAccessToken()) {
    return (
      <Link href="/login" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Log in
      </Link>
    );
  }

  if (error) {
    return <div className="max-w-72 truncate text-xs text-rosewood">{error}</div>;
  }

  if (organizations.length === 0) {
    return (
      <Link href="/organization/setup" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Create organization
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-xs text-steel">
        <span>Organization</span>
        <select
          value={activeId}
          onChange={(event) => {
            setActiveId(event.target.value);
            setActiveOrganizationId(event.target.value);
          }}
          className="min-w-48 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-ink outline-none focus:border-palm"
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
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  );
}
