"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PermissionMatrix } from "@/components/permissions/permission-matrix";
import { usePermissions } from "@/components/permissions/permission-provider";
import { FieldHelp, FieldLabel, FieldText, LedgerButton, LedgerInput, PageHeader, Toolbar } from "@/components/ui-ledger";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export default function RolesSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.roles.manage);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([PERMISSIONS.reports.view]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    setLoading(true);
    setError("");
    apiRequest<Role[]>("/roles")
      .then(setRoles)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load roles."))
      .finally(() => setLoading(false));
  }, [organizationId]);

  function togglePermission(permission: Permission) {
    setPermissions((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]));
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const role = await apiRequest<Role>("/roles", { method: "POST", body: { name, permissions } });
      router.push(`/settings/roles/${role.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Roles & Permissions"
        description="Review system roles and create custom permission sets for controlled beta access."
      />

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage roles.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading roles...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <BetaRoleGuidance />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Link key={role.id} href={`/settings/roles/${role.id}`} className="rounded-md border border-slate-200 bg-white p-4 hover:border-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{role.name}</h2>
                <p className="mt-1 text-sm text-steel">{role.permissions.length} permissions</p>
              </div>
              {role.isSystem ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">System</span> : null}
            </div>
            <p className="mt-3 text-xs text-slate-500">{role.memberCount} members assigned</p>
          </Link>
        ))}
      </section>

      {canManage ? (
        <form onSubmit={createRole} className="space-y-4">
          <Toolbar
            title="Create custom role"
            description="Custom roles can be edited or deleted when no active members are assigned. For beta testers, add only the workflow permissions needed for the testing script."
          >
            <FieldLabel className="max-w-md">
              <FieldText>Role name</FieldText>
              <LedgerInput
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Reports reviewer"
              />
              <FieldHelp>Name roles by the beta workflow or review responsibility they unlock.</FieldHelp>
            </FieldLabel>
          </Toolbar>
          <PermissionMatrix selected={permissions} onToggle={togglePermission} />
          <LedgerButton
            type="submit"
            disabled={saving || permissions.length === 0}
            variant="primary"
          >
            Create role
          </LedgerButton>
        </form>
      ) : (
        <StatusMessage type="info">Your role can view permission matrices but cannot create or edit roles.</StatusMessage>
      )}
    </div>
  );
}

export function BetaRoleGuidance() {
  return (
    <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
      <h2 className="font-semibold text-sky-950">Beta role guidance</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <p>Keep Owner/Admin roles for internal staff who manage access, settings, and revocation.</p>
        <p>Use Viewer for accountant/readability review, or a scoped role such as Sales/Purchases for workflow testing in dummy data only.</p>
        <p>Review roles before inviting testers, then suspend tester memberships from Team Members when the beta window ends.</p>
      </div>
      <p className="mt-3 text-xs leading-5">
        Role changes do not enable real ZATCA submission, live bank feeds, production email sending, or production readiness.
      </p>
    </section>
  );
}

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "error" | "info" | "loading" }>) {
  const classes = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    loading: "border-slate-200 bg-white text-steel",
  };

  return <div className={`rounded-md border px-4 py-3 text-sm ${classes[type]}`}>{children}</div>;
}
