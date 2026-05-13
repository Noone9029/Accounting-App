"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PermissionMatrix } from "@/components/permissions/permission-matrix";
import { usePermissions } from "@/components/permissions/permission-provider";
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/settings/roles" className="text-sm font-medium text-palm hover:underline">
            Back to roles
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{role?.name ?? "Role"}</h1>
          <p className="mt-1 text-sm text-steel">Permission matrix and role protection settings.</p>
        </div>
        {role?.isSystem ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">System role</span> : null}
      </header>

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage roles.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading role...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {role?.isSystem ? <StatusMessage type="info">System/default roles are protected from editing and deletion.</StatusMessage> : null}
      {!canManage ? <StatusMessage type="info">Your role can view this matrix but cannot save role changes.</StatusMessage> : null}

      {role ? (
        <form onSubmit={saveRole} className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <label className="block text-sm">
              <span className="font-medium text-ink">Role name</span>
              <input
                required
                value={name}
                disabled={readOnly}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
              />
            </label>
            <div className="mt-3 text-sm text-steel">
              {role.permissions.length} permissions. {role.memberCount} members assigned.
            </div>
          </section>

          <PermissionMatrix selected={permissions} readOnly={readOnly} onToggle={togglePermission} />

          {canManage && !role.isSystem ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || permissions.length === 0}
                className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save changes
              </button>
              <button
                type="button"
                disabled={saving || role.memberCount > 0}
                onClick={() => void deleteRole()}
                className="rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete role
              </button>
              {role.memberCount > 0 ? <span className="self-center text-sm text-steel">Assigned roles cannot be deleted.</span> : null}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "error" | "info" | "loading" | "success" }>) {
  const classes = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    loading: "border-slate-200 bg-white text-steel",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return <div className={`rounded-md border px-4 py-3 text-sm ${classes[type]}`}>{children}</div>;
}
