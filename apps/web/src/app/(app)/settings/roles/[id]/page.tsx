"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusMessage } from "@/components/common/status-message";
import { PermissionMatrix } from "@/components/permissions/permission-matrix";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerBreadcrumbs,
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export default function RoleDetailPage() {
  const organizationId = useActiveOrganizationId();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.roles.manage);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const readOnly = !canManage || Boolean(role?.isSystem);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    setLoading(true);
    setError("");
    apiRequest<Role>(`/roles/${params.id}`)
      .then((result) => {
        setRole(result);
        setName(result.name);
        setPermissions(result.permissions);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load role."))
      .finally(() => setLoading(false));
  }, [organizationId, params.id]);

  function togglePermission(permission: Permission) {
    setPermissions((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]));
  }

  async function saveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest<Role>(`/roles/${role.id}`, { method: "PATCH", body: { name, permissions } });
      setRole(updated);
      setName(updated.name);
      setPermissions(updated.permissions);
      setMessage("Role saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save role.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole() {
    if (!role) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<{ deleted: boolean }>(`/roles/${role.id}`, { method: "DELETE" });
      router.push("/settings/roles");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerBreadcrumbs items={[{ label: "Roles", href: "/settings/roles" }, { label: role?.name ?? "Role" }]} />
      <LedgerPageHeader
        eyebrow="Administration"
        title={role?.name ?? "Role"}
        description="Permission matrix and role protection settings."
        badge={role?.isSystem ? <LedgerStatusBadge tone="neutral">System role</LedgerStatusBadge> : null}
      />

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage roles.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading role...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {role?.isSystem ? <StatusMessage type="info">System/default roles are protected from editing and deletion.</StatusMessage> : null}
      {!canManage ? <StatusMessage type="info">Your role can view this matrix but cannot save role changes.</StatusMessage> : null}
      <StatusMessage type="info">
        For beta access, keep this role limited to the assigned testing script. Use Team Members to suspend testers after review, and do not use role changes to imply production
        ZATCA, live bank feeds, or real email sending.
      </StatusMessage>

      {role ? (
        <LedgerPageBody>
          <form onSubmit={saveRole} className="space-y-4">
            <LedgerToolbar
              title="Role identity"
              description={`${role.permissions.length} permissions. ${role.memberCount} members assigned.`}
              actions={
                canManage && !role.isSystem ? (
                  <>
                    <LedgerButton type="submit" disabled={saving || permissions.length === 0} variant="primary">
                      Save changes
                    </LedgerButton>
                    <LedgerButton type="button" disabled={saving || role.memberCount > 0} onClick={() => void deleteRole()} variant="danger">
                      Delete role
                    </LedgerButton>
                  </>
                ) : null
              }
            >
              <LedgerFieldLabel className="max-w-md">
                <LedgerFieldText>Role name</LedgerFieldText>
                <LedgerInput required value={name} disabled={readOnly} onChange={(event) => setName(event.target.value)} />
                <LedgerFieldHelp>
                  {role.memberCount > 0 ? "Assigned roles cannot be deleted." : "Custom roles can be removed while they have no assigned members."}
                </LedgerFieldHelp>
              </LedgerFieldLabel>
            </LedgerToolbar>

            <PermissionMatrix selected={permissions} readOnly={readOnly} onToggle={togglePermission} />
          </form>
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
  );
}
