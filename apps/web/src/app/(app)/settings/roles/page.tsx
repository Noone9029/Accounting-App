"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusMessage } from "@/components/common/status-message";
import { PermissionMatrix } from "@/components/permissions/permission-matrix";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerToolbar,
  LedgerWorkflowCard,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Roles & Permissions"
        description="Review system roles and create custom permission sets for controlled beta access."
      />

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage roles.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading roles...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <BetaRoleGuidance />

      <LedgerPageBody>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <LedgerWorkflowCard
              key={role.id}
              title={role.name}
              href={`/settings/roles/${role.id}`}
              status={role.isSystem ? <LedgerStatusBadge tone="neutral">System</LedgerStatusBadge> : null}
              description={
                <>
                  {role.permissions.length} permissions. {role.memberCount} members assigned.
                </>
              }
            />
          ))}
        </section>

        {canManage ? (
          <form onSubmit={createRole} className="space-y-4">
            <LedgerToolbar
              title="Create custom role"
              description="Custom roles can be edited or deleted when no active members are assigned. For beta testers, add only the workflow permissions needed for the testing script."
              actions={
                <LedgerButton type="submit" disabled={saving || permissions.length === 0} variant="primary">
                  Create role
                </LedgerButton>
              }
            >
              <LedgerFieldLabel className="max-w-md">
                <LedgerFieldText>Role name</LedgerFieldText>
                <LedgerInput required value={name} onChange={(event) => setName(event.target.value)} placeholder="Reports reviewer" />
                <LedgerFieldHelp>Name roles by the beta workflow or review responsibility they unlock.</LedgerFieldHelp>
              </LedgerFieldLabel>
            </LedgerToolbar>
            <PermissionMatrix selected={permissions} onToggle={togglePermission} />
          </form>
        ) : (
          <StatusMessage type="info">Your role can view permission matrices but cannot create or edit roles.</StatusMessage>
        )}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function BetaRoleGuidance() {
  return (
    <LedgerSummaryBand tone="info">
      <h2 className="font-semibold text-ink">Beta role guidance</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <p>Keep Owner/Admin roles for internal staff who manage access, settings, and revocation.</p>
        <p>Use Viewer for accountant/readability review, or a scoped role such as Sales/Purchases for workflow testing in dummy data only.</p>
        <p>Review roles before inviting testers, then suspend tester memberships from Team Members when the beta window ends.</p>
      </div>
      <p className="mt-3 text-xs leading-5">
        Role changes do not enable real ZATCA submission, live bank feeds, production email sending, or production readiness.
      </p>
    </LedgerSummaryBand>
  );
}
